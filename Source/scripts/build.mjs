// Bundles src/main.js (ES modules + three.js) into dist/game.js.
// Usage: node scripts/build.mjs [--release]   (release = minified, no source map)
// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = process.argv.includes('--release');

const res = await build({
  entryPoints: [path.join(root, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  outfile: path.join(root, 'dist', 'game.js'),
  sourcemap: !release,
  minify: release,
  legalComments: 'none',
  target: ['chrome120'],
  logLevel: 'warning',
  metafile: true,
});
const out = Object.values(res.metafile.outputs).find((o) => o.bytes > 0);
console.log(`built dist/game.js (${(out.bytes / 1024).toFixed(0)} KB${release ? ', release' : ''})`);
