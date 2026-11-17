#!/bin/bash
cd /home/claude/Medieval_Kingdoms/GameProject
npx esbuild tests/render_entry.js --bundle --outfile=tests/out/render_bundle.js --format=iife --sourcemap --log-level=warning 2>&1 | head
node tests/shot.cjs "$@" 2>&1 | grep -v "^\[page\] warning"
