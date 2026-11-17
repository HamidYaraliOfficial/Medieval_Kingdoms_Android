# Changelog

## 1.0.1 — Android release

Copyright © 2026 Hamid Yarali. All Rights Reserved.

- **Android version** (APK, Android 7.0+ / API 24, landscape): the same game in a WebView shell, fully offline, no permissions.
- **Touch controls:** tap = select / order, drag = move the map, hold then drag = selection box, two fingers = zoom, rotate and
  pan, finger-following placement ghost with on-screen confirm / rotate / cancel buttons, tap-to-set rally point, tappable
  control-group slots in the army panel, minimap touch support, deselect button.
- **Compact touch HUD:** slim top bar, side rail with the Build / Army / Technology / Kingdom buttons, bottom-sheet build menu,
  selection bar shown only when something is selected, tooltips and hover hints replaced by tap hints.
- First start on a touch device defaults to Low quality, no edge scrolling and no fullscreen request; the Exit button is hidden.
- Android Back button: closes the open menu, opens the pause menu in a game, asks the OS to leave from the main menu.
- The game pauses and auto-saves when the app goes to the background.
- **Release signing:** `android/offline-apk/build-apk.mjs` (no Android SDK needed), an Android Studio / Gradle project in `android/`
  and a GitHub Actions workflow all sign with your own release keystore and refuse the Android debug key (the reason Cafe Bazaar
  rejects "debug" packages).
- Fixed: the objectives panel and the villager stats line printed the text "null" in some situations.

## 1.0.0 — first release

Copyright © 2026 Hamid Yarali. All Rights Reserved.

- Complete 3D medieval real-time strategy game: economy, building, army, siege, AI, campaign.
- 8 resources (wood, stone, iron, gold, food, wheat, flour, bread) with a wheat → flour → bread production chain.
- 31 building types (economic, military, defensive, administrative); placement with rotation, upgrade by technology, demolish, relocate.
- 13 unit types with walking, attack, gathering and building animations; 6 formations, 3 stances, patrol, attack-move, garrison, retreat, control groups.
- Siege: walls, gates, towers, moats and bridges, rams, catapults and siege towers.
- AI opponents on 4 difficulty levels (Easy, Normal, Hard, Expert) that build an economy, train armies, attack in waves and siege.
- Modes: Campaign (7 missions), Skirmish, Free Build, Custom Battle.
- 7 hand-built maps plus a random-map generator; 3 map sizes.
- 30 technologies (13 economy, 17 military) in 3 tiers.
- Weather (clear, rain, storm) and a day/night cycle.
- Fully procedural 3D models, textures and audio (music, effects, ambience with independent volumes); no external game assets.
- English and Persian (right-to-left layout, Persian digits).
- Settings: graphics presets (Low–Ultra), resolution, fullscreen, shadows, anti-aliasing, FPS limit, volume sliders, rebindable keys.
- 8 versioned save slots with autosave, quick-save/quick-load.
- Windows packaging: portable `Game.exe` (Electron runtime) and an NSIS installer `GameSetup.exe`.
