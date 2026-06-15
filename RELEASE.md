# Release Guide

This document covers Firebase setup, AdMob configuration, and Android release preparation.

---

## 1. Firebase Setup

### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" and follow the wizard
3. Disable Google Analytics if not needed (or enable for insights)

### Enable Authentication

1. In Firebase Console, go to **Authentication > Sign-in method**
2. Enable **Anonymous** sign-in (required for zero-friction auth)
3. Optionally enable **Google** sign-in for account linking

### Enable Firestore

1. Go to **Firestore Database > Create database**
2. Choose production mode
3. Set location closest to your users

### Set Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Add Firebase Config to the App

1. In Firebase Console, go to **Project Settings > General > Your apps**
2. Click the web icon (</>) to add a web app
3. Copy the config object
4. Open `src/firebase/FirebaseManager.js` and paste the values into `FIREBASE_CONFIG`:

```javascript
const FIREBASE_CONFIG = {
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};
```

---

## 2. AdMob Configuration

### Ad Unit IDs

Ad unit IDs are configured in `src/ads/AdManager.js`:

```javascript
const AD_IDS = {
  banner: {
    production: 'ca-app-pub-XXXXX/YYYYY',  // Replace with your real ID
    test: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    production: 'ca-app-pub-XXXXX/YYYYY',  // Replace with your real ID
    test: 'ca-app-pub-3940256099942544/1033173712',
  },
  rewarded: {
    production: 'ca-app-pub-XXXXX/YYYYY',  // Replace with your real ID
    test: 'ca-app-pub-3940256099942544/5224354917',
  },
};
```

### Switching from Test to Production

1. Open `src/ads/AdManager.js`
2. Replace the `production` values with your real AdMob ad unit IDs
3. Change `USE_TEST_IDS` from `true` to `false`:

```javascript
const USE_TEST_IDS = false; // Set to false for production release
```

### Android AdMob Setup

1. Add your AdMob App ID to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

2. The `@capacitor-community/admob` plugin handles the rest automatically.

### Ad Placement Strategy

| Ad Type | Trigger | Frequency |
|---------|---------|-----------|
| Banner | After level 2 | Persistent (bottom) |
| Interstitial | Between levels | Every 3 levels, max 1 per 3 min |
| Rewarded | Game over screen | Voluntary (earn extra piece/coins) |

---

## 3. Building for Android

### Prerequisites

- Node.js 18+
- Android Studio (latest)
- Java JDK 17+

### Build Steps

```bash
# 1. Install dependencies
npm install

# 2. Build web assets
npm run build

# 3. Sync with Capacitor
npx cap sync android

# 4. Open in Android Studio
npx cap open android
```

Or use the combined command:
```bash
npm run build:android
npm run open:android
```

### In Android Studio

1. Wait for Gradle sync to complete
2. Select your device/emulator
3. Click Run (green play button)
4. For release build: Build > Generate Signed Bundle/APK

---

## 4. Release Checklist

### Before Submitting to Play Store

- [ ] Switch `USE_TEST_IDS` to `false` in AdManager.js
- [ ] Add real AdMob ad unit IDs
- [ ] Add Firebase config values
- [ ] Set Firestore security rules in production mode
- [ ] Update `capacitor.config.json` app ID if needed
- [ ] Generate release keystore for signing
- [ ] Test all ad types on a real device
- [ ] Test Firebase sync (anonymous auth + Firestore)
- [ ] Update version number in `package.json` and `android/app/build.gradle`
- [ ] Prepare store listing assets (icon, screenshots, feature graphic)
- [ ] Create privacy policy (required for apps with ads/auth)
- [ ] Set content rating (IARC questionnaire in Play Console)
- [ ] Set target audience and content (declare COPPA compliance)

### Privacy Policy Requirements

Your app collects:
- Anonymous authentication tokens (Firebase Auth)
- Gameplay progress data (Firestore)
- Advertising ID (via AdMob)

You must disclose this in your privacy policy and in the Play Console Data Safety section.

### COPPA Compliance

This app is configured for child-directed treatment:
- `tagForChildDirectedTreatment: true` in AdMob init
- Only non-personalized ads are shown
- No personal data collection beyond anonymous game progress

---

## 5. Signing the APK/AAB

```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias blockblast

# Store keystore securely - never commit to version control
```

In Android Studio:
1. Build > Generate Signed Bundle / APK
2. Choose Android App Bundle (recommended)
3. Select your keystore
4. Build release variant

---

## 6. Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# UI mode (browser-based test viewer)
npm run test:ui
```
