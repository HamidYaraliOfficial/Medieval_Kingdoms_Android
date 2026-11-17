# Build guide

Copyright © 2026 Hamid Yarali. All Rights Reserved.

The game is plain JavaScript (ES modules) rendered with three.js and wrapped in an Electron shell for the desktop build.
The `Source/` folder contains everything needed to rebuild it.

## Requirements

* Node.js 20 or newer (with npm)
* Internet access for the first `npm install` (downloads three.js, Electron, esbuild, packager tools and the fonts)
* For the installer: NSIS 3 (`makensis`). On Windows install it from https://nsis.sourceforge.io and make sure
  `makensis.exe` is on PATH (or set the `MAKENSIS` environment variable to its full path).

## One-click (Windows)

Double-click **`BUILD.bat`** in the package root. It runs `npm install`, builds the game, creates the portable folder
and, when NSIS is found, the installer. Results:

* `Source\build\win\Game-win32-x64\Game.exe` — portable game folder
* `Source\build\GameSetup.exe` — installer

## Manual steps (any OS)

```
cd Source
npm install
npm run build        # bundles src/ -> dist/game.js (development build, with source map)
npm start            # run the game in Electron
npm run package      # builds build/win/Game-win32-x64/Game.exe (Windows x64 target; works from Linux/macOS too)
npm run installer    # builds build/GameSetup.exe with NSIS
npm run dist         # build + package + installer
```

Notes

* `npm run package` downloads the Electron Windows runtime on first use. If the machine is offline, put
  `electron-v<version>-win32-x64.zip` in a folder and set `ELECTRON_ZIP_DIR` to that folder.
* The icon and the version information (company, product name, copyright) are written into `Game.exe` with `resedit`;
  no Wine or Windows tools are needed.
* `npm run installer` looks for `makensis` in this order: the `MAKENSIS` variable, `makensis` on PATH, the
  electron-builder NSIS cache. If `makensis` needs its data folder, set `NSISDIR` to the folder that contains
  `Include`, `Plugins` and `Stubs`.
* Running the game in a normal browser also works for development: open `UI/index.html` after `npm run build`
  (saves then use the browser's local storage instead of files).

## Project layout

```
src/        game code (game rules, economy, AI, units, buildings, rendering, UI, menus, audio, i18n, saves)
UI/         index.html + style.css (HUD and menu styling)
electron/   desktop shell: main process (window, file storage, fullscreen) and preload bridge
assets/     fonts (SIL OFL) and the application icon
scripts/    build.mjs, package.mjs, installer.mjs, installer.nsi
tests/      headless tests (simulation and Playwright-driven UI/screenshot tests)
```

## Tests

`npm test` runs the headless simulation test (`tests/sim.mjs`). The UI and screenshot tests in `tests/*.cjs` need
Playwright and a Chromium build (`node tests/app.cjs`, `node tests/input_test.cjs`, `node tests/gallery.cjs <scene>`).
