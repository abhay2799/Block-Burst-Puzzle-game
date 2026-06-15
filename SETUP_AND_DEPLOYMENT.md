# Installation & Deployment Guide (Windows)

## Block Blast — Complete Setup, Build, and Play Store Publishing Guide

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup on Windows](#project-setup-on-windows)
3. [Running the Development Server](#running-the-development-server)
4. [Building for Production (Web)](#building-for-production-web)
5. [Android Development Setup](#android-development-setup)
6. [Building the Android App](#building-the-android-app)
7. [App Signing and Keystore](#app-signing-and-keystore)
8. [Generating Release APK/AAB](#generating-release-apkaab)
9. [Google AdMob Integration](#google-admob-integration)
10. [Google Play Console Setup](#google-play-console-setup)
11. [Store Listing Requirements](#store-listing-requirements)
12. [Privacy Policy](#privacy-policy)
13. [Data Safety Form](#data-safety-form)
14. [Production Release Checklist](#production-release-checklist)
15. [Post-Launch Best Practices](#post-launch-best-practices)
16. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install the following on your Windows machine:

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 18.x or 20.x LTS | https://nodejs.org/ |
| npm | Comes with Node.js | — |
| Git | Latest | https://git-scm.com/download/win |
| Android Studio | Latest (Hedgehog+) | https://developer.android.com/studio |
| JDK | 17 (bundled with Android Studio) | — |
| VS Code (optional) | Latest | https://code.visualstudio.com/ |

### Android Studio Setup

1. Install Android Studio
2. During setup, ensure these are checked:
   - Android SDK
   - Android SDK Platform-Tools
   - Android Emulator (optional, for testing)
3. After install, open SDK Manager:
   - Install **Android 14 (API 34)** SDK Platform
   - Install **Android SDK Build-Tools 34.x**
4. Set environment variables (System → Advanced → Environment Variables):
   ```
   ANDROID_HOME = C:\Users\<YourUser>\AppData\Local\Android\Sdk
   ```
   Add to PATH:
   ```
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   ```

---

## Project Setup on Windows

### 1. Extract the Project

Extract the ZIP file to a folder, e.g.:
```
C:\Projects\block-blast\
```

### 2. Install Dependencies

Open Command Prompt or PowerShell in the project folder:

```bash
cd C:\Projects\block-blast
npm install
```

This installs all packages listed in `package.json`:
- `phaser` (game engine)
- `zzfx` (procedural audio)
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` (native wrapper)
- `vite` (build tool)

### 3. Verify Installation

```bash
npx vite --version
npx cap --version
```

Both should print version numbers without errors.

---

## Running the Development Server

```bash
npm run dev
```

This starts a local server (usually at `http://localhost:5173/`). Open in browser to play/test.

### Hot Reload

Changes to source files in `src/` are reflected instantly in the browser without manual refresh.

---

## Building for Production (Web)

```bash
npm run build
```

Output goes to `dist/` folder. This is a static site that can be hosted anywhere (Netlify, Vercel, GitHub Pages).

### Preview Production Build

```bash
npm run preview
```

---

## Android Development Setup

### 1. Sync Capacitor

After any code changes:

```bash
npm run build:android
```

This runs `vite build` and then `npx cap sync android`.

### 2. Open in Android Studio

```bash
npm run open:android
```

Or manually open the `android/` folder in Android Studio.

### 3. Run on Emulator or Device

In Android Studio:
1. Create an AVD (Android Virtual Device) via Device Manager, or connect a physical phone via USB with Developer Mode enabled
2. Click the green **Run** button (or Shift+F10)
3. Select your target device
4. Wait for build and installation

### 4. Run on Physical Device

1. Enable **Developer Options** on your Android phone (tap Build Number 7 times)
2. Enable **USB Debugging**
3. Connect phone via USB
4. Allow USB debugging prompt on phone
5. Select device in Android Studio and click Run

---

## App Signing and Keystore

### Create a Release Keystore

**IMPORTANT:** Keep your keystore file safe. If you lose it, you cannot update your app on Play Store.

Open Command Prompt and run:

```bash
keytool -genkey -v -keystore block-blast-release.keystore -alias block-blast -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- Keystore password (remember this!)
- Your name, organization, city, state, country
- Key password (can be same as keystore password)

### Store the Keystore Safely

1. Save `block-blast-release.keystore` somewhere secure (NOT in the project repository)
2. Create `android/key.properties` (DO NOT commit):

```properties
storePassword=your_keystore_password
keyPassword=your_key_password
keyAlias=block-blast
storeFile=C:\\path\\to\\block-blast-release.keystore
```

### Configure Signing in build.gradle

Edit `android/app/build.gradle`:

```gradle
// Add above the android { } block:
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## Generating Release APK/AAB

### Option A: Android App Bundle (AAB) — Required for Play Store

```bash
cd android
.\gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Option B: APK (for direct distribution/testing)

```bash
cd android
.\gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Verify the Build

```bash
# Check AAB contents
bundletool build-apks --bundle=app/build/outputs/bundle/release/app-release.aab --output=test.apks --mode=universal
```

---

## Google AdMob Integration

### 1. Create AdMob Account

1. Go to https://admob.google.com/
2. Sign in with your Google account
3. Complete account setup (payment info, etc.)

### 2. Create an App in AdMob

1. Apps → Add app
2. Platform: Android
3. App name: Block Blast
4. Link to Play Store (after publishing) or select "No, I haven't published it yet"
5. Note your **App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

### 3. Create Ad Units

Create these ad units in AdMob Console:

| Ad Type | Usage | Placement |
|---------|-------|-----------|
| Interstitial | Between levels | After level complete (every 3 levels) |
| Banner | Menu screen | Bottom of menu |
| Rewarded (optional) | Extra life/undo | After game over |

Note down each **Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`).

### 4. Install AdMob Capacitor Plugin

```bash
npm install @capacitor-community/admob
npx cap sync android
```

### 5. Configure AndroidManifest.xml

Add inside `<application>` in `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

Replace with your actual AdMob App ID.

### 6. Initialize AdMob in Code

Update `src/ads/AdManager.js`:

```javascript
import { AdMob, AdMobBannerSize } from '@capacitor-community/admob';

// Initialize on app start
await AdMob.initialize({
  requestTrackingAuthorization: false,  // iOS only
  tagForChildDirectedTreatment: true,   // COPPA compliance
});

// Show Interstitial
await AdMob.prepareInterstitial({
  adId: 'ca-app-pub-XXXXXXXX/YYYYYYYYYY',  // Your interstitial ad unit ID
  isTesting: true  // Set to false for production!
});
await AdMob.showInterstitial();

// Show Banner
await AdMob.showBanner({
  adId: 'ca-app-pub-XXXXXXXX/YYYYYYYYYY',  // Your banner ad unit ID
  adSize: AdMobBannerSize.BANNER,
  position: 'BOTTOM_CENTER',
  isTesting: true
});
```

### 7. Test Ads

**ALWAYS use test mode during development!** Set `isTesting: true` or use Google's test ad unit IDs:

| Type | Test Ad Unit ID |
|------|----------------|
| Banner | `ca-app-pub-3940256099942544/6300978111` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` |

**WARNING:** Using real ad unit IDs during testing can get your AdMob account banned.

### 8. Switch to Production Ads

Before publishing, change:
- `isTesting: false`
- Replace test IDs with your real Ad Unit IDs
- Verify ads load correctly on a real device

---

## Google Play Console Setup

### 1. Create Developer Account

1. Go to https://play.google.com/console/
2. Pay the one-time $25 registration fee
3. Complete identity verification (can take 48 hours)

### 2. Create App

1. Click **"Create app"**
2. App name: `Block Blast`
3. Default language: English
4. App type: Game
5. Free or Paid: Free (with ads)
6. Declarations: Accept all policies

### 3. Complete App Information

Navigate through the left sidebar and fill in:

- **App access:** All functionality is available without restrictions
- **Ads:** Yes, contains ads
- **Content rating:** Complete the IARC questionnaire (select "Casual games", no violence, no user interaction)
- **Target audience:** Select appropriate age groups (if targeting under 13, COPPA applies)
- **News apps:** Not a news app
- **COVID-19:** Not related
- **Data safety:** See section below
- **Government apps:** No

---

## Store Listing Requirements

### Required Assets

| Asset | Specification |
|-------|--------------|
| App icon | 512 x 512 px, PNG, 32-bit, no alpha |
| Feature graphic | 1024 x 500 px, PNG or JPEG |
| Screenshots (phone) | Min 2, max 8. Min 320px, max 3840px per side. 16:9 or 9:16 |
| Screenshots (tablet) | Optional but recommended. Same specs |
| Short description | Max 80 characters |
| Full description | Max 4000 characters |

### Short Description Example

```
Addictive block puzzle game! Drag, drop, and blast lines to score big!
```

### Full Description Example

```
Block Blast is a fun and addictive puzzle game from Devlance Studio!

HOW TO PLAY:
• Drag and drop blocks onto the 8x8 grid
• Fill a complete row or column to clear it
• Clear multiple lines at once for combo bonuses
• Progress through increasingly challenging levels

FEATURES:
• Beautiful 3D block graphics
• Satisfying sound effects and haptic feedback
• Progressive level system with increasing difficulty
• Line-blast prediction shows which lines will clear
• Combo system rewards consecutive clears
• Works offline - no internet required!

Challenge yourself to beat your high score and conquer every level!

Made with love by Devlance Studio.
```

### Content Rating

1. Go to Policy → App content → Content rating
2. Start the IARC questionnaire
3. For Block Blast, typical answers:
   - No violence, no sexual content
   - No user-generated content
   - No real gambling
   - No in-app purchases (ads only)
   - Select "Casual" category
4. Expected rating: **PEGI 3 / Everyone**

---

## Privacy Policy

A privacy policy is **REQUIRED** for all apps on Google Play.

### What to Include

1. What data is collected (analytics events, crash logs, ad identifiers)
2. How data is used (improve app, serve ads)
3. Third-party services (AdMob, Firebase Analytics, Firebase Crashlytics)
4. Children's privacy (COPPA compliance if targeting under 13)
5. Data retention period
6. User rights (deletion, opt-out)
7. Contact information

### Where to Host

- Create a free page on GitHub Pages, Notion, or Google Sites
- URL format: `https://devlance.studio/privacy-policy` or similar
- Enter this URL in Play Console → Policy → App content → Privacy policy

### Template

```markdown
# Privacy Policy for Block Blast

Last updated: [Date]

Devlance Studio ("we") operates the Block Blast mobile application.

## Information We Collect

### Automatically Collected
- Device information (model, OS version)
- Game analytics (levels played, scores, session duration)
- Crash reports and error logs
- Advertising identifier (for personalized ads)

### We Do NOT Collect
- Personal names, emails, or phone numbers
- Location data
- Photos, contacts, or files
- Payment information

## Third-Party Services

Our app uses:
- **Google AdMob** - Serves advertisements. Privacy policy: https://policies.google.com/privacy
- **Firebase Analytics** - Tracks anonymous usage data. Privacy policy: https://firebase.google.com/support/privacy
- **Firebase Crashlytics** - Collects crash reports

## Children's Privacy

Block Blast is designed to be kid-friendly. We comply with COPPA and do not knowingly 
collect personal information from children under 13. Ads shown are tagged as 
child-directed content.

## Data Retention

Analytics data is retained for 14 months. Crash logs are retained for 90 days.

## Your Rights

You can reset your advertising ID through your device settings. You can also 
request data deletion by contacting us.

## Contact

Email: [your-email@domain.com]
Studio: Devlance Studio

## Changes

We may update this policy. Changes will be posted here with an updated date.
```

---

## Data Safety Form

Google Play requires a Data Safety declaration.

### For Block Blast (Ads + Analytics), declare:

#### Data Collected

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Device or other IDs | Yes | Yes (with ad networks) | Advertising, Analytics |
| App interactions | Yes | No | Analytics |
| Crash logs | Yes | No | App functionality |
| App performance data | Yes | No | App functionality |

#### Declarations

- **Is all collected data encrypted in transit?** Yes
- **Do you provide a way for users to request data deletion?** Yes (via contact email)
- **Does your app target children or comply with Families policies?** (Select based on your target audience)
- **Is data collection required or optional?** Required (analytics/ads are integral)

#### Security Practices

- Data is encrypted in transit (HTTPS)
- Users can request account/data deletion
- Data is handled according to Google's Families Policy (if targeting children)

---

## Production Release Checklist

### Before Building Release

- [ ] Replace test ad IDs with real AdMob Ad Unit IDs
- [ ] Set `isTesting: false` in AdMob initialization
- [ ] Verify `com.devlance.blockblast` package name is consistent everywhere
- [ ] Update `versionCode` and `versionName` in `android/app/build.gradle`
- [ ] Remove any `console.log()` or debug code
- [ ] Test on at least 3 different Android devices/screen sizes
- [ ] Test offline functionality
- [ ] Verify all sounds play correctly
- [ ] Test game over → restart flow
- [ ] Test level progression: level 1 → complete → ad → level 2
- [ ] Verify splash screen shows correctly

### Building the Release

- [ ] Run `npm run build:android` (builds web + syncs)
- [ ] Open `android/` in Android Studio
- [ ] Build → Generate Signed Bundle/APK
- [ ] Select AAB format
- [ ] Use your release keystore
- [ ] Select `release` build variant
- [ ] Verify AAB is generated successfully

### Play Console Submission

- [ ] Upload AAB to Production track (or Internal Testing first)
- [ ] Complete all store listing fields
- [ ] Upload all required screenshots and graphics
- [ ] Complete content rating questionnaire
- [ ] Complete data safety form
- [ ] Set pricing (Free)
- [ ] Select countries for distribution
- [ ] Review and submit for review

### Post-Submission

- [ ] Google review typically takes 1-7 days
- [ ] Monitor for rejection emails and address issues
- [ ] Once approved, the app appears on Play Store within hours

---

## Post-Launch Best Practices

### Version Updates

1. Increment `versionCode` (integer, must increase every release)
2. Update `versionName` (display version, e.g., "1.1.0")
3. Build new AAB
4. Upload to Play Console → Release → Production → Create new release

### Monitoring

- Check Firebase Crashlytics daily for the first week
- Monitor AdMob revenue and fill rates
- Track retention in Firebase Analytics
- Respond to user reviews on Play Store

### ASO (App Store Optimization)

- Use relevant keywords in title and description
- Update screenshots regularly
- Encourage happy users to leave reviews
- A/B test store listing graphics

### Recommended Release Strategy

1. **Internal Testing** (just you and team) → verify everything works
2. **Closed Testing** (invite 10-20 friends) → get feedback
3. **Open Testing** (anyone can join) → wider feedback
4. **Production** → full launch

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm install` fails | Delete `node_modules` and `package-lock.json`, run `npm install` again |
| Vite won't start | Check port isn't in use: `netstat -ano \| findstr :5173` |
| Android build fails | Run `cd android && .\gradlew clean` then rebuild |
| Capacitor sync fails | Ensure `dist/` folder exists (run `npm run build` first) |
| App crashes on launch | Check `adb logcat` for errors; common: missing `google-services.json` |
| White screen in app | WebView not loading; check `android/app/src/main/assets/public/` has files |
| Keystore lost | You CANNOT recover a lost keystore. Back it up in multiple locations |
| AdMob shows no ads | New accounts/apps have low fill rates initially; wait 24-48 hours |
| Play Store rejection | Read rejection email carefully; common: missing privacy policy or content rating |
| App not appearing in search | ASO takes time; usually 1-2 weeks after approval |
| Slow on old devices | Reduce particle count in `GameScene.js` `animateLineClear()` |

### Useful Commands

```bash
# Check connected Android devices
adb devices

# View app logs
adb logcat | findstr "blockblast"

# Install APK directly
adb install app-release.apk

# Clear app data on device
adb shell pm clear com.devlance.blockblast

# Check Gradle version
cd android && .\gradlew --version
```

---

## Tech Stack Reference

| Component | Technology |
|-----------|-----------|
| Game Engine | Phaser 4 |
| Audio | ZzFX (procedural) |
| Build Tool | Vite 6 |
| Language | JavaScript (ES Modules) |
| Native Wrapper | Capacitor 8 |
| Ads | Google AdMob |
| Analytics | Firebase Analytics |
| Crash Reporting | Firebase Crashlytics |
| Platform | Android (WebView) |

---

## File Structure

```
block-blast/
├── android/                  # Native Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/devlance/blockblast/
│   │   │   │   └── MainActivity.java
│   │   │   ├── res/         # Icons, splash, resources
│   │   │   ├── assets/public/  # Built web app (auto-synced)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle     # App-level build config
│   └── build.gradle          # Project-level build config
├── public/                   # Static assets
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   └── icons/                # App icons
├── src/                      # Game source code
│   ├── ads/AdManager.js
│   ├── audio/SoundManager.js
│   ├── game/
│   │   ├── Board.js
│   │   ├── LevelManager.js
│   │   ├── Pieces.js
│   │   └── ScoreManager.js
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── SplashScene.js
│   │   ├── MenuScene.js
│   │   ├── GameScene.js
│   │   ├── GameOverScene.js
│   │   └── LevelCompleteScene.js
│   ├── utils/Constants.js
│   └── main.js
├── capacitor.config.json     # Capacitor config
├── index.html
├── package.json
├── FIREBASE_SETUP.md         # Firebase guide
└── SETUP_AND_DEPLOYMENT.md   # This file
```

---

*Document prepared by Devlance Studio. For questions, contact the development team.*
