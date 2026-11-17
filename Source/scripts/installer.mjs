// Compiles the Windows installer  build/GameSetup.exe  from the packaged game folder (run `npm run package` first).
// Needs NSIS 3 (makensis). Lookup order: env MAKENSIS, `makensis` on PATH, the electron-builder NSIS cache.
// If makensis needs its data folder, set NSISDIR (the folder that contains Include/, Plugins/, Stubs/).
// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const src = path.join(root, 'build', 'win', 'Game-win32-x64');
const out = path.join(root, 'build', 'GameSetup.exe');
if (!fs.existsSync(path.join(src, 'Game.exe'))) { console.error('Game.exe not found - run "npm run package" first.'); process.exit(1); }

// locate NSIS
let makensis = process.env.MAKENSIS || '';
let nsisDir = process.env.NSISDIR || '';
if (!makensis) {
  const cache = path.join(os.homedir(), '.cache', 'electron-builder', 'nsis-3.0.4.1');
  const hit = fs.existsSync(cache) ? fs.readdirSync(cache).map((d) => path.join(cache, d)).find((d) => fs.existsSync(path.join(d, 'Include', 'MUI2.nsh'))) : null;
  const probe = spawnSync(process.platform === 'win32' ? 'makensis.exe' : 'makensis', ['-VERSION'], { encoding: 'utf8' });
  if (!probe.error && probe.status === 0) makensis = process.platform === 'win32' ? 'makensis.exe' : 'makensis';
  else if (hit) {
    makensis = process.platform === 'win32' ? path.join(hit, 'Bin', 'makensis.exe') : path.join(hit, 'linux', 'makensis');
    nsisDir = nsisDir || hit;
  }
}
if (!makensis) { console.error('makensis (NSIS 3) not found. Install NSIS or set MAKENSIS / NSISDIR.'); process.exit(1); }

const sizeKB = (function du(d) { let n = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); n += e.isDirectory() ? du(p) : fs.statSync(p).size; } return n; })(src) / 1024 | 0;
const slash = (p) => p.split(path.sep).join('/');
const args = [
  `-DSRCDIR=${slash(src)}`, `-DOUTFILE=${slash(out)}`, `-DICON=${slash(path.join(root, 'assets', 'icons', 'icon.ico'))}`,
  `-DLICENSEFILE=${slash(path.join(root, 'LICENSE'))}`, `-DVERSION=${pkg.version}`, `-DSIZEKB=${sizeKB}`, '-V2',
  path.join(root, 'scripts', 'installer.nsi'),
];
console.log(`[installer] ${makensis}`);
const r = spawnSync(makensis, args, { stdio: 'inherit', env: { ...process.env, ...(nsisDir ? { NSISDIR: nsisDir } : {}) } });
if (r.status !== 0) { console.error('[installer] makensis failed'); process.exit(r.status || 1); }
console.log(`[installer] ${out} (${(fs.statSync(out).size / 1048576).toFixed(0)} MB)`);
