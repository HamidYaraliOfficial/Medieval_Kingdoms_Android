# Iron Crown — Android build

Copyright © 2026 Hamid Yarali. All Rights Reserved.

The Android app is a thin native shell (one `Activity` with a `WebView`) that serves the game from the app's own
assets at `https://appassets.androidplatform.net/`. Nothing is downloaded at run time, no permissions are requested.
Package: `com.hamidyarali.ironcrown` · minSdk 24 (Android 7.0) · targetSdk 34 · landscape.
`versionCode = major*10000 + minor*100 + patch` from `package.json` (1.0.1 → 10001). Raise the version in `package.json`
(and `src/data.js`) before every update you publish.

## The one rule for stores: sign with a RELEASE key

Cafe Bazaar answers **«بسته نباید با کلید دیباگ امضا (Sign) شده باشد»** when the APK is signed with the automatic
*Android Debug* certificate (`CN=Android Debug`). Every path below refuses to use that key and fails instead.
Use **one** release key forever for this app: updates signed with another key cannot replace the published app.

### 1. Create your key (once)

```
node android/make-keystore.mjs
```

Creates `android/keystore/ironcrown-release.jks` and `android/keystore/keystore.properties` (random password).
**Back up the whole `android/keystore/` folder in several places and keep it private.** It is git-ignored.
(The ready-made package ships a key made in advance in its `Keystore/` folder; copy that folder's two files into
`android/keystore/` to build with exactly the same key as the shipped APK.)

## Way A — offline builder (no Android SDK, no Gradle) — what produced the shipped APK

Needs Node.js 18+ and a JDK 11+ (`java`, `keytool` on PATH). First run downloads apktool and uber-apk-signer from GitHub
(versions pinned and SHA-256 checked).

```
npm install            (once; downloads three.js, esbuild …)
node android/offline-apk/build-apk.mjs
```

Output: `android/dist/IronCrown-<version>-release.apk` + `.sha256` + `CERTIFICATE.txt` (the signer certificate; it must not
say "Android Debug"). Options: `--no-web` (reuse the already built game payload), `--out <folder>`.
Key from environment instead of the file: `IC_KEYSTORE`, `IC_KEY_ALIAS`, `IC_KEYSTORE_PASSWORD`, `IC_KEY_PASSWORD`.

How it works: `scripts/android_web.mjs` bundles the game for Chromium 90+ into `android/app/src/main/assets/www/`;
`android/offline-apk/template/` is a decoded WebView shell; apktool packs it with the game, uber-apk-signer aligns it and
signs it with APK Signature Scheme v2 + v3 using your key.

## Way B — GitHub Actions (cloud build, no tools on your PC)

1. Push the project to a GitHub repository (the key files are git-ignored; do **not** commit them).
2. Encode the key and copy the output:
   * Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("ironcrown-release.jks")) | Set-Clipboard`
   * Linux / macOS: `base64 -w0 ironcrown-release.jks`
3. Repository → **Settings → Secrets and variables → Actions → New repository secret**, add four secrets:

   | Name | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | the base64 text from step 2 |
   | `ANDROID_KEYSTORE_PASSWORD` | `storePassword` from `keystore.properties` |
   | `ANDROID_KEY_ALIAS` | `ironcrown` |
   | `ANDROID_KEY_PASSWORD` | `keyPassword` from `keystore.properties` |

4. **Actions → "Android release" → Run workflow** (also runs on tags `v*`). Download the artifact `IronCrown-release`
   (APK + AAB). The workflow stops with an error if a secret is missing or if the result is signed with the debug key.

The workflow uses Gradle 8.9 through `gradle/actions/setup-gradle`, so no Gradle wrapper file is needed in the repository.

## Way C — Android Studio

Open the `android/` folder, let Studio sync (it offers to create the Gradle wrapper). Before building run
`node scripts/android_web.mjs` once so that `app/src/main/assets/www` exists. With `android/keystore/keystore.properties`
present, **Build → Generate Signed App Bundle / APK** is not needed: `./gradlew assembleRelease` (or `bundleRelease` for an
.aab) signs with that key. Without a keystore the build stops with an error; there is no debug fallback.

## Check an APK yourself

```
apksigner verify --verbose --print-certs IronCrown-1.0.1-release.apk      (Android SDK build-tools)
keytool -printcert -jarfile IronCrown-1.0.1-release.apk
```

The owner must be your name, not `CN=Android Debug`, and `Verified using v2 scheme` must be `true`.

## What was and was not tested

Tested: the game running in desktop Chromium with phone emulation (touch events, 851×393 / 640×360, English and Persian)
and served from the same virtual origin as in the app; the Java/XML sources compile against the Android 34 `android.jar`;
the offline builder runs end to end and its output verifies with v2/v3 signatures and no debug certificate.
**Not tested:** installing or running the APK on a real device or an emulator (none was available), the Gradle and GitHub
Actions builds (they could not be run here), real-phone performance. The first run on a touch device defaults to Low quality;
raise it in Settings if your phone copes.
