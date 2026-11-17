#!/bin/bash
cd "$(dirname "$0")" && npx esbuild src/main.js --bundle --outfile=dist/game.js --format=iife --sourcemap --log-level=warning
