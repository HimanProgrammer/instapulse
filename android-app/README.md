# InstaPulse Android app

The Android app is a native shell (Capacitor 6) around the live web app, so every website update reaches the app without a new APK.

## Get the APK (no setup)
GitHub → **Actions** → **Android APK** → latest run → download **InstaPulse-debug-apk** → install on the phone (allow "install unknown apps").

## Build on your PC (Android Studio)
```bash
cd android-app
npm install
npx cap add android
npx capacitor-assets generate --android
npx cap open android
```
Then in Android Studio: **Build → Generate Signed App Bundle / APK** (AAB for Play Store).

## Play Store
Google Play developer account: one-time US$25. Upload the signed **.aab**, plus the Privacy Policy URL `https://instapulse-lime.vercel.app/legal/privacy.html`.
