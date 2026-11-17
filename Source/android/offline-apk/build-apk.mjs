// Builds a RELEASE-SIGNED Android APK without the Android SDK / Gradle:
//   game web payload  +  apktool template (WebView shell)  ->  apktool  ->  zipalign + APK signature v2/v3 with YOUR keystore.
// Needs: Node 18+, Java 11+ (java and keytool on PATH). Downloads apktool and uber-apk-signer (pinned + SHA-256 checked) on first run.
//
//   node android/offline-apk/build-apk.mjs [--no-web] [--out <dir>]
//   env  IC_KEYSTORE  IC_KEY_ALIAS  IC_KEYSTORE_PASSWORD  [IC_KEY_PASSWORD]      (or android/keystore/keystore.properties)
//
// The script refuses to sign with a debug key: a missing keystore is an error, never a fallback.
// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(here, '..');
const root = path.resolve(androidDir, '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const outDir = path.resolve(opt('--out', path.join(androidDir, 'dist')));
const toolsDir = path.join(here, 'tools');
const work = path.join(here, 'work');

const TOOLS = {
  apktool: { file: 'apktool-2.11.1.jar', url: 'https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar', sha256: '56d59c524fc764263ba8d345754d8daf55b1887818b15cd3b594f555d249e2db' },
  signer: { file: 'uber-apk-signer-1.3.0.jar', url: 'https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar', sha256: 'e1299fd6fcf4da527dd53735b56127e8ea922a321128123b9c32d619bba1d835' },
};
const fail = (m) => { console.error('\nERROR: ' + m); process.exit(1); };
const run = (cmd, a, o = {}) => { const r = spawnSync(cmd, a, { encoding: 'utf8', ...o, env: { ...process.env, JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS || '', ...(o.env || {}) } }); return r; };
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

async function ensureTool(t) {
  const f = process.env[t === TOOLS.apktool ? 'APKTOOL_JAR' : 'SIGNER_JAR'] || path.join(toolsDir, t.file);
  if (!fs.existsSync(f)) {
    console.log(`[apk] downloading ${t.file} ...`);
    fs.mkdirSync(toolsDir, { recursive: true });
    const res = await fetch(t.url); if (!res.ok) fail(`download failed (${res.status}) for ${t.url}`);
    fs.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  }
  if (sha256(f) !== t.sha256) fail(`${f}: SHA-256 does not match the pinned value; delete the file and run again.`);
  return f;
}
function readKeystoreConfig() {
  const cfg = { file: process.env.IC_KEYSTORE, alias: process.env.IC_KEY_ALIAS, storePass: process.env.IC_KEYSTORE_PASSWORD, keyPass: process.env.IC_KEY_PASSWORD };
  const pf = path.join(androidDir, 'keystore', 'keystore.properties');
  if (!cfg.file && fs.existsSync(pf)) {
    const p = Object.fromEntries(fs.readFileSync(pf, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
    cfg.file = path.resolve(path.dirname(pf), p.storeFile || ''); cfg.alias = p.keyAlias; cfg.storePass = p.storePassword; cfg.keyPass = p.keyPassword;
  }
  if (!cfg.file || !cfg.alias || !cfg.storePass) fail('No release keystore configured. Create one with "node android/make-keystore.mjs" (see android/README.md) or set IC_KEYSTORE, IC_KEY_ALIAS and IC_KEYSTORE_PASSWORD.\nThis script never signs with a debug key.');
  if (!fs.existsSync(cfg.file)) fail('Keystore file not found: ' + cfg.file);
  cfg.keyPass = cfg.keyPass || cfg.storePass; return cfg;
}
function certInfo(ks) {
  const r = run('keytool', ['-list', '-v', '-keystore', ks.file, '-alias', ks.alias, '-storepass', ks.storePass]);
  if (r.status !== 0) fail('keytool could not read the keystore (wrong password or alias?):\n' + (r.stdout || '') + (r.stderr || ''));
  const out = r.stdout; const owner = (/Owner: (.*)/.exec(out) || [])[1] || ''; const fp = ((/SHA256: ([0-9A-F:]+)/i.exec(out) || [])[1] || '').replace(/:/g, '').toLowerCase();
  if (/CN=Android Debug/i.test(owner)) fail('This keystore contains the Android DEBUG certificate. Stores such as Cafe Bazaar reject it. Create a real release key with android/make-keystore.mjs.');
  return { owner, fp };
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const [maj, min, pat] = pkg.version.split('.').map((n) => parseInt(n, 10) || 0);
const versionName = pkg.version, versionCode = maj * 10000 + min * 100 + pat;

if (run('java', ['-version']).status !== 0) fail('Java was not found. Install a JDK/JRE (11 or newer) and make sure "java" is on PATH.');
const ks = readKeystoreConfig(); const cert = certInfo(ks);
const apktool = await ensureTool(TOOLS.apktool), signer = await ensureTool(TOOLS.signer);

if (!flag('--no-web')) { const r = run(process.execPath, [path.join(root, 'scripts', 'android_web.mjs')], { stdio: 'inherit' }); if (r.status !== 0) fail('building the web payload failed'); }
const www = path.join(androidDir, 'app', 'src', 'main', 'assets', 'www');
if (!fs.existsSync(path.join(www, 'index.html'))) fail('web payload missing: run "node scripts/android_web.mjs" first');

fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
const proj = path.join(work, 'project');
fs.cpSync(path.join(here, 'template'), proj, { recursive: true });
fs.cpSync(www, path.join(proj, 'assets', 'www'), { recursive: true });
const yml = path.join(proj, 'apktool.yml');
fs.writeFileSync(yml, fs.readFileSync(yml, 'utf8').replace(/versionCode: \d+/, 'versionCode: ' + versionCode).replace(/versionName: .*/, 'versionName: ' + versionName));

console.log(`[apk] ${pkg.version} (versionCode ${versionCode}) - apktool build`);
const unsigned = path.join(work, 'unsigned.apk');
let r = run('java', ['-jar', apktool, 'b', proj, '-o', unsigned], { stdio: ['ignore', 'pipe', 'pipe'] });
if (r.status !== 0 || !fs.existsSync(unsigned)) fail('apktool failed:\n' + r.stdout + r.stderr);

console.log('[apk] zipalign + sign (APK Signature Scheme v2/v3) with ' + cert.owner);
const signedDir = path.join(work, 'signed'); fs.mkdirSync(signedDir, { recursive: true });
r = run('java', ['-jar', signer, '-a', unsigned, '--ks', ks.file, '--ksAlias', ks.alias, '--ksPass', ks.storePass, '--ksKeyPass', ks.keyPass, '--verifySha256', cert.fp, '--out', signedDir], { stdio: ['ignore', 'pipe', 'pipe'] });
const log = (r.stdout || '') + (r.stderr || '');
if (r.status !== 0 || !/signature verified/.test(log) || /Android Debug/i.test(log)) fail('signing or verification failed:\n' + log);
const signed = fs.readdirSync(signedDir).find((f) => f.endsWith('.apk')); if (!signed) fail('no signed APK produced');

fs.mkdirSync(outDir, { recursive: true });
const final = path.join(outDir, `IronCrown-${versionName}-release.apk`);
fs.copyFileSync(path.join(signedDir, signed), final);
const digest = sha256(final);
fs.writeFileSync(final + '.sha256', `${digest}  ${path.basename(final)}\n`);
fs.writeFileSync(path.join(outDir, 'CERTIFICATE.txt'), `Signing certificate of ${path.basename(final)}\nOwner : ${cert.owner}\nSHA-256: ${cert.fp}\n(Must NOT be "CN=Android Debug".  Keep using the same key for every update you upload to Cafe Bazaar.)\n`);
console.log(`\n[apk] OK  ${final}  (${(fs.statSync(final).size / 1048576).toFixed(2)} MB)\n[apk] sha256 ${digest}\n[apk] signer ${cert.owner}\n[apk] cert   ${cert.fp}`);
fs.rmSync(work, { recursive: true, force: true });
