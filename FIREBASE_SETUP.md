# Firebase Setup Guide — Block Blast

This guide explains how to connect the Block Blast application to Firebase for analytics, crash reporting, remote configuration, and optional backend features.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create a Firebase Project](#create-a-firebase-project)
3. [Register the Android App](#register-the-android-app)
4. [Download and Place google-services.json](#download-and-place-google-servicesjson)
5. [Add Firebase SDK to Android](#add-firebase-sdk-to-android)
6. [Firebase Authentication (Optional)](#firebase-authentication-optional)
7. [Firestore Database (Optional)](#firestore-database-optional)
8. [Firebase Realtime Database (Optional)](#firebase-realtime-database-optional)
9. [Firebase Storage (Optional)](#firebase-storage-optional)
10. [Firebase Cloud Functions (Optional)](#firebase-cloud-functions-optional)
11. [Firebase Analytics (Recommended)](#firebase-analytics-recommended)
12. [Firebase Crashlytics (Recommended)](#firebase-crashlytics-recommended)
13. [Firebase Remote Config (Optional)](#firebase-remote-config-optional)
14. [Environment Variables](#environment-variables)
15. [Security Rules](#security-rules)
16. [Testing](#testing)
17. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Google Account
- Firebase Console access: https://console.firebase.google.com/
- Android Studio installed
- The Block Blast project with Capacitor Android set up

---

## Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Enter project name: `block-blast` (or any name)
4. Enable/disable Google Analytics as desired (recommended: enable)
5. If Analytics enabled, select or create a Google Analytics account
6. Click **"Create project"**
7. Wait for provisioning to complete, then click **"Continue"**

---

## Register the Android App

1. In Firebase Console, click the **Android icon** (Add app)
2. Enter the Android package name: `com.devlance.blockblast`
   - This MUST match `appId` in `capacitor.config.json`
3. App nickname: `Block Blast`
4. SHA-1 certificate fingerprint (for Authentication):
   ```bash
   # Generate debug SHA-1:
   cd android
   ./gradlew signingReport
   ```
   Copy the SHA-1 from the `debug` variant output.
5. Click **"Register app"**

---

## Download and Place google-services.json

1. After registering, download `google-services.json`
2. Place it in:
   ```
   android/app/google-services.json
   ```
3. **IMPORTANT:** Do NOT commit this file to public repositories. Add to `.gitignore`:
   ```
   android/app/google-services.json
   ```

---

## Add Firebase SDK to Android

### Project-level build.gradle (`android/build.gradle`)

Add the Google services classpath:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.0'
        classpath 'com.google.gms:google-services:4.4.0'
        // For Crashlytics:
        classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
    }
}
```

### App-level build.gradle (`android/app/build.gradle`)

Add at the bottom of the file:

```gradle
apply plugin: 'com.google.gms.google-services'
// For Crashlytics:
apply plugin: 'com.google.firebase.crashlytics'
```

Add Firebase dependencies in the `dependencies` block:

```gradle
dependencies {
    // Firebase BoM (Bill of Materials) - manages all Firebase versions
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    
    // Analytics (recommended)
    implementation 'com.google.firebase:firebase-analytics'
    
    // Crashlytics (recommended)
    implementation 'com.google.firebase:firebase-crashlytics'
    
    // Authentication (optional)
    implementation 'com.google.firebase:firebase-auth'
    
    // Firestore (optional)
    implementation 'com.google.firebase:firebase-firestore'
    
    // Realtime Database (optional)
    implementation 'com.google.firebase:firebase-database'
    
    // Storage (optional)
    implementation 'com.google.firebase:firebase-storage'
    
    // Remote Config (optional)
    implementation 'com.google.firebase:firebase-config'
}
```

### Sync Gradle

After editing, click **"Sync Now"** in Android Studio or run:

```bash
cd android
./gradlew build
```

---

## Firebase Authentication (Optional)

Use if you want user accounts, leaderboards, or cloud saves.

### Enable Auth Providers

1. Firebase Console → Authentication → Sign-in method
2. Enable desired providers:
   - **Anonymous** (recommended for games — zero friction)
   - **Google** (for leaderboards, requires SHA-1)
   - **Email/Password** (if needed)

### Implementation (Capacitor Plugin)

```bash
npm install @capacitor-firebase/authentication
npx cap sync android
```

### Usage in JavaScript:

```javascript
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// Anonymous sign-in
const result = await FirebaseAuthentication.signInAnonymously();
const userId = result.user.uid;

// Google sign-in
const googleResult = await FirebaseAuthentication.signInWithGoogle();
```

---

## Firestore Database (Optional)

Use for leaderboards, user profiles, or cloud game saves.

### Create Database

1. Firebase Console → Firestore Database
2. Click **"Create database"**
3. Choose **Production mode** (or Test mode for development)
4. Select a Cloud Firestore location (choose closest to your users)

### Example Structure for Leaderboards

```
leaderboards/
  global/
    {docId}/
      userId: "abc123"
      displayName: "Player1"
      score: 5000
      level: 8
      timestamp: Timestamp
```

### Implementation

```bash
npm install @capacitor-firebase/firestore
npx cap sync android
```

```javascript
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

// Save high score
await FirebaseFirestore.addDocument({
  reference: 'leaderboards/global',
  data: {
    userId: currentUser.uid,
    score: 5000,
    level: 8,
    timestamp: new Date().toISOString()
  }
});
```

---

## Firebase Realtime Database (Optional)

Alternative to Firestore for real-time data. Use if you need live leaderboards.

### Create Database

1. Firebase Console → Realtime Database
2. Click **"Create Database"**
3. Choose location, start in **Locked mode**

### Usage

```javascript
import { FirebaseDatabase } from '@capacitor-firebase/database';

await FirebaseDatabase.set({
  path: `scores/${userId}`,
  value: { score: 5000, level: 8 }
});
```

---

## Firebase Storage (Optional)

Use for storing user avatars, custom level data, or replay files.

### Setup

1. Firebase Console → Storage
2. Click **"Get started"**
3. Set security rules (see Security Rules section)

---

## Firebase Cloud Functions (Optional)

Use for server-side logic like score validation, daily challenge generation, or anti-cheat.

### Setup

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

### Example Function (Score Validation)

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.submitScore = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  const { score, level } = data;
  
  // Validate score is reasonable
  if (score > 100000 || level > 50) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid score');
  }
  
  await admin.firestore().collection('leaderboards').add({
    userId: context.auth.uid,
    score,
    level,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true };
});
```

### Deploy

```bash
firebase deploy --only functions
```

---

## Firebase Analytics (Recommended)

Analytics is automatically enabled once `google-services.json` is in place and the Analytics SDK is added.

### Custom Events (via Capacitor)

```bash
npm install @capacitor-firebase/analytics
npx cap sync android
```

```javascript
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

// Log level complete
await FirebaseAnalytics.logEvent({
  name: 'level_complete',
  params: { level: 5, score: 2500 }
});

// Log game over
await FirebaseAnalytics.logEvent({
  name: 'game_over',
  params: { level: 3, score: 1200, lines_cleared: 15 }
});
```

---

## Firebase Crashlytics (Recommended)

Automatically captures crashes and ANRs once the SDK and plugin are added.

```bash
npm install @capacitor-firebase/crashlytics
npx cap sync android
```

### Force a Test Crash

```javascript
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

// Test crash (remove before production!)
await FirebaseCrashlytics.crash({ message: 'Test crash' });
```

---

## Firebase Remote Config (Optional)

Use to A/B test game parameters without releasing updates.

### Example Parameters

| Key | Default | Description |
|-----|---------|-------------|
| `level_1_lines` | 3 | Lines to clear on level 1 |
| `ad_frequency` | 3 | Show ad every N levels |
| `hard_piece_multiplier` | 1.0 | Difficulty scaling factor |

### Implementation

```javascript
import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config';

await FirebaseRemoteConfig.fetchAndActivate();
const adFrequency = await FirebaseRemoteConfig.getNumber({ key: 'ad_frequency' });
```

---

## Environment Variables

Create a `.env` file in the project root (DO NOT commit to version control):

```
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:android:abc123def456
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Note:** For this Capacitor Android project, Firebase config is handled entirely via `google-services.json`. The environment variables above are only needed if you add a web-based Firebase SDK directly.

Add to `.gitignore`:

```
.env
android/app/google-services.json
```

---

## Security Rules

### Firestore Rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leaderboard - anyone can read, only authenticated users can write
    match /leaderboards/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // User profiles - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Testing

1. **Enable debug mode** in Firebase Analytics:
   ```bash
   adb shell setprop debug.firebase.analytics.app com.devlance.blockblast
   ```

2. **View real-time events** in Firebase Console → Analytics → DebugView

3. **Test Crashlytics** by triggering a test crash, then check Firebase Console → Crashlytics

4. **Firestore emulator** for local development:
   ```bash
   firebase emulators:start
   ```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `google-services.json` not found | Ensure file is in `android/app/` (not `android/`) |
| Package name mismatch | Verify `com.devlance.blockblast` matches in Firebase, `capacitor.config.json`, and `AndroidManifest.xml` |
| SHA-1 mismatch | Re-run `./gradlew signingReport` and update in Firebase Console |
| Analytics not showing | Wait 24 hours for standard Analytics; use DebugView for real-time |
| Crashlytics not reporting | Ensure device has internet; crashes appear after app restarts |
| Build fails after adding Firebase | Run `./gradlew clean` then rebuild |
| `duplicate class` errors | Ensure you're using Firebase BoM and not manually specifying conflicting versions |

---

## Summary

For a minimal game launch, you need:
1. `google-services.json` placed in `android/app/`
2. Firebase Analytics SDK (automatic event tracking)
3. Firebase Crashlytics (automatic crash reporting)

Everything else (Auth, Firestore, Storage, Functions, Remote Config) is optional and can be added later as you scale the game.
