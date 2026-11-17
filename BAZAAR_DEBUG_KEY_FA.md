# خطای کافه‌بازار: «بسته نباید با کلید دیباگ امضا (Sign) شده باشد»

## چرا این خطا آمد؟

هر APK باید با یک «کلید امضا» امضا شود. اگر خودتان کلید نسازید، Android/Gradle خودکار از **کلید دیباگ** استفاده می‌کند
(گواهی با نام `CN=Android Debug`). کافه‌بازار بسته‌هایی با این گواهی را قبول نمی‌کند، چون این کلید روی همهٔ کامپیوترها مشابه است و هر کسی می‌تواند با آن بستهٔ شما را جعل کند.

من هر دو فایل شما را بررسی کردم:

| فایل | گواهی امضا | debuggable |
|---|---|---|
| `Chistan.apk` | **Android Debug** (SHA-256 گواهی: `53ce165a…0158d`) | خیر |
| `Chistan-debug.apk` | **Android Debug** (همان) | بله |

یعنی `Chistan.apk` از نوع release ساخته شده، ولی در مرحلهٔ امضا باز هم با کلید دیباگ امضا شده است. معمولاً علتش یکی از این‌هاست
(بدون دیدن Workflow شما نمی‌توانم دقیق بگویم کدام): در `build.gradle` برای `release` هیچ `signingConfig` تعریف نشده یا به‌صورت صریح `signingConfigs.debug` داده شده؛ یا Workflow دستور `assembleDebug` را اجرا می‌کند یا فایل بی‌امضا را با `debug.keystore` امضا می‌کند.

## راه سریع (همین الان)

در پوشهٔ `Chistan_ReSigned/` همان `Chistan.apk` شما با محتوای بدون تغییر آمده، فقط با یک **کلید ریلیز تازه** امضا شده است (v2 و v3، گواهی `CN=Hamid Yarali, OU=Chistan`). همین را در بازار آپلود کنید.

* کلید آن در `Keystore/chistan-release.jks` است؛ برای **همهٔ آپدیت‌های بعدی چیستان** باید از همین کلید استفاده کنید.
* محتوای APK دست نخورده است (فقط بخش امضا عوض شده). این فایل را روی گوشی واقعی اجرا نکرده‌ام.
* اگر چیستان را قبلاً جایی (مثلاً روی گوشی کاربران یا فروشگاه دیگر) با کلید دیگری منتشر کرده‌اید، نسخهٔ امضاشده با کلید جدید روی آن نصب‌شده «آپدیت» حساب نمی‌شود و باید ابتدا نسخهٔ قبلی حذف شود. برای انتشار اولِ بازار مشکلی نیست.

## راه درست و همیشگی (برای ساخت با GitHub)

1. کلید ریلیز بسازید (یک بار):
   `keytool -genkeypair -v -keystore chistan-release.jks -alias chistan -keyalg RSA -keysize 4096 -validity 10950`
   (یا همان فایل `Keystore/chistan-release.jks` را استفاده کنید.)
2. فایل را Base64 کنید: ویندوز PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("chistan-release.jks")) | Set-Clipboard` ؛ لینوکس: `base64 -w0 chistan-release.jks`
3. در GitHub: Settings ← Secrets and variables ← Actions، این Secretها را بسازید: `ANDROID_KEYSTORE_BASE64`، `ANDROID_KEYSTORE_PASSWORD`، `ANDROID_KEY_ALIAS`، `ANDROID_KEY_PASSWORD`.
4. در `app/build.gradle` پروژهٔ چیستان:

```groovy
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KS_PATH") ?: "release.jks")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release      // نه signingConfigs.debug
            minifyEnabled false
        }
    }
}
```

5. در Workflow: فایل Base64 را به `release.jks` برگردانید و `./gradlew assembleRelease` (یا `bundleRelease`) را اجرا کنید؛ **نه** `assembleDebug`.
6. پیش از آپلود بررسی کنید: `apksigner verify --print-certs app-release.apk` ؛ نباید `Android Debug` ببینید.

نمونهٔ کامل و آمادهٔ همین کار (برای بازی من) در `Source/.github/workflows/android-release.yml` و `Source/android/app/build.gradle` هست؛ می‌توانید الگو بگیرید.
