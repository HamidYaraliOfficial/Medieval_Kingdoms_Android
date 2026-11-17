# Iron Crown — Android edition 1.0.1

Developer: Hamid Yarali (حمید یارعلی)
Copyright © 2026 Hamid Yarali. All Rights Reserved.

## What is in this package

| Folder / file | Description |
|---|---|
| `APK/IronCrown-1.0.1-release.apk` | **Install this / upload this to Cafe Bazaar.** Signed with a release key (not the debug key). |
| `APK/CERTIFICATE.txt`, `.sha256` | Signing certificate details and file hash. |
| `Keystore/` | **Your signing keys** (Iron Crown and Chistan) and their passwords. Read "Signing key" below. |
| `Chistan_ReSigned/` | Your own `Chistan.apk`, content unchanged, re-signed with a release key so Bazaar accepts it. |
| `BAZAAR_DEBUG_KEY_FA.md` | Why Bazaar said "the package must not be signed with a debug key" and how to fix it for good (Persian). |
| `Source/` | The complete project: game, Android Studio / Gradle project, offline APK builder, GitHub Actions workflow, tests. Build guide: `Source/android/README.md`. |
| `Screenshots/` | Phone-layout screenshots (emulated in desktop Chromium, English and Persian). |

## Install

Copy the APK to the phone, open it, allow "install from this source" if Android asks. Or `adb install IronCrown-1.0.1-release.apk`.
Requires Android 7.0+ and a WebView/Chrome of version 90 or newer. The game is landscape, fully offline and requests no
permissions. The first start uses Low graphics quality; raise it in Settings if the phone copes.

Touch controls: tap = select / order, drag = pan, hold half a second then drag = selection box, pinch = zoom, two-finger
twist = rotate, ✓ / ⟳ / ✕ buttons to confirm / rotate / cancel a building, control groups in the Army panel, Android Back =
close menu / pause. Full table: `Source/CONTROLS.md`.

## Cafe Bazaar

Package `com.hamidyarali.ironcrown`, versionCode `10001`, versionName `1.0.1`; APK signature v2 + v3; certificate
`CN=Hamid Yarali` (not "Android Debug"); no permissions, no native libraries. For each update raise the version in
`package.json` and `src/data.js`, rebuild, and sign with the **same** key. Store listing text, screenshots and the age rating are
filled in on the Bazaar panel by you.

## Signing key

Back up `Keystore/` in several private places and never publish it. Without the key you can never update the app; with a
leaked key anyone can sign packages as you. These keys were generated in a cloud sandbox with random passwords; if you want a
key that only ever existed on your own computer, create one before the first publication (`node android/make-keystore.mjs`)
and rebuild. A published app's key cannot be changed.

## Rebuild

1. Offline, no Android SDK: install Node.js 18+ and a JDK, then `npm install` and `node android/offline-apk/build-apk.mjs`
   (put the keystore in `android/keystore/`, see `Keystore/KEYSTORE_INFO.txt`).
2. GitHub Actions: add the secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
   `ANDROID_KEY_PASSWORD`, run the "Android release" workflow.
3. Android Studio: open `android/`.

## What was and was not tested

Tested: the real game in desktop Chromium with phone emulation (touch gestures, 851×393 and 640×360, English and Persian,
served from the same virtual origin the app uses); the Java/XML sources compile against the Android 34 SDK stubs; the APK
builds reproducibly from `Source/`, verifies with v2/v3 signatures and carries no debug certificate.
**Not tested:** installing/running the APK on a real device or emulator (none was available), frame rate on real phones, the
Gradle and GitHub Actions builds (not runnable here), sound. The Windows `Game.exe` / `GameSetup.exe` are still version 1.0.0
and untested on Windows; the small "null" text bug fixed in 1.0.1 is still in them until you rebuild with `BUILD.bat`.
