// Creates your RELEASE keystore (a new private signing key) in android/keystore/ and a keystore.properties file that the build scripts read.
//   node android/make-keystore.mjs
// BACK UP android/keystore/ (several places). If you lose the key you can never publish an update of the app under the same package name.
// Never commit the keystore or keystore.properties (they are git-ignored). Needs "keytool" (part of any JDK).
// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'keystore');
const file = path.join(dir, 'ironcrown-release.jks');
if (fs.existsSync(file)) { console.error('A keystore already exists: ' + file + '\nNot overwriting it. Delete it yourself if you really want a new key (you would lose the ability to update published apps).'); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const pw = crypto.randomBytes(24).toString('base64url').slice(0, 28);
const dname = process.env.IC_DNAME || 'CN=Hamid Yarali, OU=Iron Crown Medieval Kingdoms, O=Hamid Yarali';
const r = spawnSync('keytool', ['-genkeypair', '-keystore', file, '-storetype', 'JKS', '-alias', 'ironcrown', '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10950', '-storepass', pw, '-keypass', pw, '-dname', dname], { stdio: ['ignore', 'inherit', 'inherit'] });
if (r.status !== 0) { console.error('keytool failed. Is a JDK installed and "keytool" on PATH?'); process.exit(1); }
fs.writeFileSync(path.join(dir, 'keystore.properties'), `storeFile=ironcrown-release.jks\nkeyAlias=ironcrown\nstorePassword=${pw}\nkeyPassword=${pw}\n`);
fs.writeFileSync(path.join(dir, 'README.txt'), 'KEEP THIS FOLDER SECRET AND BACK IT UP.\nironcrown-release.jks  = your private signing key (needed for EVERY update on Cafe Bazaar).\nkeystore.properties    = alias and passwords.\nFor GitHub Actions put these four values in repository secrets (see android/README.md).\n');
console.log('\nCreated ' + file + '\nPasswords are in ' + path.join(dir, 'keystore.properties') + '\nBACK THIS FOLDER UP NOW.');
