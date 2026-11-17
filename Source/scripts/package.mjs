// Builds the portable Windows x64 game folder:  build/win/Game-win32-x64/Game.exe
// Works from Linux/macOS/Windows (the Windows Electron runtime zip is used; icon + version info are
// written into the exe with resedit, no Wine needed).
//
// Env:  ELECTRON_ZIP_DIR  folder that already holds electron-v<ver>-win32-x64.zip (optional, avoids a download)
// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
import { packager } from '@electron/packager';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const electronVersion = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', 'electron', 'package.json'), 'utf8')).version;
const stage = path.join(root, 'build', 'stage');
const outDir = path.join(root, 'build', 'win');

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.cpSync(path.join(root, from), path.join(root, to), { recursive: true }); };

console.log(`[package] Electron ${electronVersion}, win32-x64`);
rm(stage); rm(outDir);
fs.mkdirSync(stage, { recursive: true });

// 1. release bundle (minified, no source map) straight into the stage folder
await build({
  entryPoints: [path.join(root, 'src', 'main.js')], bundle: true, format: 'iife', minify: true, legalComments: 'none',
  target: ['chrome120'], outfile: path.join(stage, 'dist', 'game.js'), logLevel: 'warning',
});

// 2. runtime files only
copy('electron', 'build/stage/electron');
copy('UI', 'build/stage/UI');
copy('assets/fonts', 'build/stage/assets/fonts');
copy('assets/icons', 'build/stage/assets/icons');
for (const f of ['LICENSE', 'COPYRIGHT.txt', 'THIRD_PARTY_ASSETS.md']) if (fs.existsSync(path.join(root, f))) copy(f, `build/stage/${f}`);
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
  name: 'iron-crown-medieval-kingdoms', productName: 'Iron Crown Medieval Kingdoms', version: pkg.version,
  description: pkg.description, author: pkg.author, license: 'UNLICENSED', main: 'electron/main.cjs',
}, null, 2));

// 3. package
const zipDir = process.env.ELECTRON_ZIP_DIR || undefined;
const opts = {
  dir: stage, out: outDir, name: 'Game', platform: 'win32', arch: 'x64', electronVersion,
  asar: true, prune: false, overwrite: true, executableName: 'Game',
  icon: path.join(root, 'assets', 'icons', 'icon.ico'),
  appVersion: pkg.version, appCopyright: 'Copyright (c) 2026 Hamid Yarali. All Rights Reserved.',
  win32metadata: {
    CompanyName: 'Hamid Yarali',
    FileDescription: 'Iron Crown: Medieval Kingdoms',
    ProductName: 'Iron Crown: Medieval Kingdoms',
    InternalName: 'Game',
    OriginalFilename: 'Game.exe',
  },
};
if (zipDir) opts.electronZipDir = zipDir;
const [appPath] = await packager(opts);

// 4. trim: keep only the en-US and fa UI locale packs (the game's own UI is not Chromium's)
const loc = path.join(appPath, 'locales');
if (fs.existsSync(loc)) for (const f of fs.readdirSync(loc)) if (!['en-US.pak', 'fa.pak'].includes(f)) rm(path.join(loc, f));
// Electron's own licence file stays (renamed so it is not mistaken for the game's licence); LICENSES.chromium.html stays too.
if (fs.existsSync(path.join(appPath, 'LICENSE'))) fs.renameSync(path.join(appPath, 'LICENSE'), path.join(appPath, 'LICENSE.electron.txt'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(appPath, 'LICENSE.txt'));
for (const f of ['COPYRIGHT.txt', 'THIRD_PARTY_ASSETS.md']) fs.copyFileSync(path.join(root, f), path.join(appPath, f));

const exe = path.join(appPath, 'Game.exe');
if (!fs.existsSync(exe)) throw new Error('Game.exe was not produced');
console.log(`[package] ${exe} (${(fs.statSync(exe).size / 1048576).toFixed(0)} MB)`);
fs.writeFileSync(path.join(root, 'build', 'win-path.txt'), appPath);
