# ODYX — Android Application (Flutter)

Native Android client for **ODYX — Smart Betting Intelligence**, connected directly to the existing ODYX Vercel backend API and Firebase Auth / Firestore infrastructure.

## Architecture Overview

- **Location**: `flutter_app/` (isolated from the web app and Vercel serverless routes)
- **Package ID**: `com.odyx.app`
- **Backend API**: Configurable via `--dart-define=API_BASE_URL=...` (zero hardcoded URLs)
- **Database & Auth**: Shared Firebase project (`gen-lang-client-0092843012`) targeting Firestore database `ai-studio-remixsportybetod-c683f60e-2134-4acf-acfa-6e6e253f4657`
- **Independent Feeds**: Preserves strict separation between `SPORTYBET_TZ` and `BETPAWA_TZ` feeds with permanent `WON` / `LOST` / `VOID` immutability.

## Local Development & Testing

```bash
cd flutter_app
flutter pub get
flutter analyze
flutter test

# Run on Android emulator or device pointing to your Vercel backend:
flutter run --dart-define=API_BASE_URL=https://your-odyx-project.vercel.app

# Build local release artifacts:
flutter build apk --release --dart-define=API_BASE_URL=https://your-odyx-project.vercel.app
flutter build appbundle --release --dart-define=API_BASE_URL=https://your-odyx-project.vercel.app
```

> Use `http://10.0.2.2:3000` when testing against a local backend server from the Android emulator.

## GitHub Actions Automated Android Build

Workflow file: `.github/workflows/android-build.yml`

1. Go to your GitHub repository **Settings → Secrets and variables → Actions**.
2. Add **Repository Variable**:
   - `API_BASE_URL`: Full URL of your deployed Vercel backend (e.g., `https://your-odyx-project.vercel.app`).
3. *(Optional, for Google Play signing & Google Services)* Add **Repository Secrets**:
   - `ANDROID_KEYSTORE_BASE64`: `base64 -w 0 upload-keystore.jks`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
   - `GOOGLE_SERVICES_JSON_BASE64`: `base64 -w 0 google-services.json` (only needed if adding Firebase Android SHA-1 / Crashlytics)
4. Push to `main` (or trigger **Actions → Android Release Build → Run workflow**).
5. Download `odyx-release-apk` (direct Android install) or `odyx-release-aab` (Google Play upload) from the workflow run artifacts, or push a `v1.0.0` tag to create a GitHub Release automatically.

## Generate an Android Upload Keystore

```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
base64 -w 0 upload-keystore.jks
```

Never commit `upload-keystore.jks`, `android/key.properties`, or `google-services.json`.
