// Builds the web payload that the Android app serves from its assets:
//   android/app/src/main/assets/www/{index.html, style.css, game.js, fonts/*.woff2}
// Used by both Android build paths (Gradle / GitHub Actions and the offline apktool builder).
// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });

// Android System WebView 90+ (Chromium 90, 2021) is the minimum: newer syntax is down-levelled by esbuild.
await build({
  entryPoints: [path.join(root, 'src', 'main.js')], bundle: true, format: 'iife', minify: true, legalComments: 'none',
  target: ['chrome90'], outfile: path.join(out, 'game.js'), logLevel: 'warning',
});

const html = fs.readFileSync(path.join(root, 'UI', 'index.html'), 'utf8').replace('../dist/game.js', 'game.js');
if (!html.includes('src="game.js"')) throw new Error('index.html: script tag not rewritten');
fs.writeFileSync(path.join(out, 'index.html'), html);
const css = fs.readFileSync(path.join(root, 'UI', 'style.css'), 'utf8').replace(/\.\.\/assets\/fonts\//g, 'fonts/');
if (css.includes('../assets')) throw new Error('style.css: font paths not rewritten');
fs.writeFileSync(path.join(out, 'style.css'), css);
for (const f of fs.readdirSync(path.join(root, 'assets', 'fonts'))) fs.copyFileSync(path.join(root, 'assets', 'fonts', f), path.join(out, 'fonts', f));

const size = (p) => (fs.statSync(p).size / 1024).toFixed(0);
console.log(`[android-web] ${out}`);
console.log(`[android-web] game.js ${size(path.join(out, 'game.js'))} KB, style.css ${size(path.join(out, 'style.css'))} KB, ${fs.readdirSync(path.join(out, 'fonts')).length} font files`);
