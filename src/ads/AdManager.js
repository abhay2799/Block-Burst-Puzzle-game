/**
 * AdManager - Real AdMob integration via @capacitor-community/admob.
 *
 * PRODUCTION AD UNIT IDS:
 * Banner:       ca-app-pub-3214717672189600/3883361100
 * Interstitial:  ca-app-pub-3214717672189600/7614036794
 *
 * Test IDs (Google official):
 * Banner:       ca-app-pub-3940256099942544/6300978111
 * Interstitial:  ca-app-pub-3940256099942544/1033173712
 * Rewarded:     ca-app-pub-3940256099942544/5224354917
 */

import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

// ═══════════════════════════════════════════════
// CONFIGURATION — Change USE_TEST_IDS to true for dev
// ═══════════════════════════════════════════════
const USE_TEST_IDS = false;

const AD_IDS = {
  banner: {
    production: 'ca-app-pub-3214717672189600/3883361100',
    test: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    production: 'ca-app-pub-3214717672189600/7614036794',
    test: 'ca-app-pub-3940256099942544/1033173712',
  },
};

function getAdId(type) {
  return USE_TEST_IDS ? AD_IDS[type].test : AD_IDS[type].production;
}

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let admobInitialized = false;
let interstitialLoaded = false;
let bannerShowing = false;
let initializationInProgress = false;

// Retry config
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

export const AdManager = {
  _isShowing: false,
  _lastInterstitialTime: 0,
  MIN_INTERSTITIAL_INTERVAL: 180000, // 3 minutes
  _listenersRegistered: false,
  _gameOverCount: 0,
  _gameInstance: null,
  _interstitialRetryCount: 0,
  _bannerRetryCount: 0,

  _restoreInput() {
    if (this._gameInstance) {
      try {
        const scenes = this._gameInstance.scene.getScenes(true);
        for (const scene of scenes) {
          if (scene.input) {
            scene.input.enabled = true;
          }
        }
      } catch (e) {
        // Scene may have been destroyed
      }
    }
  },

  /**
   * Check if we're running on a native platform (Android/iOS)
   */
  _isNativePlatform() {
    try {
      return Capacitor.isNativePlatform();
    } catch (e) {
      return false;
    }
  },

  shouldShowGameOverAd() {
    return true;
  },

  /**
   * Initialize AdMob. Safe to call multiple times — will only init once.
   */
  async initialize() {
    // Already initialized
    if (admobInitialized) {
      console.log('[AdManager] Already initialized, skipping');
      return true;
    }

    // Another init is in progress
    if (initializationInProgress) {
      console.log('[AdManager] Initialization already in progress, waiting...');
      // Wait for the in-progress init to complete
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!initializationInProgress) {
            clearInterval(check);
            resolve(admobInitialized);
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => { clearInterval(check); resolve(admobInitialized); }, 10000);
      });
    }

    // Not on native platform — skip silently
    if (!this._isNativePlatform()) {
      console.log('[AdManager] Not on native platform, ads disabled');
      return false;
    }

    initializationInProgress = true;

    try {
      console.log('[AdManager] ═══ Initializing AdMob ═══');
      console.log('[AdManager] Platform:', Capacitor.getPlatform());
      console.log('[AdManager] USE_TEST_IDS:', USE_TEST_IDS);
      console.log('[AdManager] Banner ID:', getAdId('banner'));
      console.log('[AdManager] Interstitial ID:', getAdId('interstitial'));

      await AdMob.initialize({
        requestTrackingAuthorization: false,
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
        testingDevices: [],
      });

      admobInitialized = true;
      console.log('[AdManager] ✅ AdMob initialized successfully');

      // Register listeners only once
      if (!this._listenersRegistered) {
        this._registerListeners();
      }

      // Pre-load interstitial
      this.prepareInterstitial();

      return true;
    } catch (e) {
      console.error('[AdManager] ❌ AdMob init FAILED:', e.message || e);
      console.error('[AdManager] Error details:', JSON.stringify(e));
      return false;
    } finally {
      initializationInProgress = false;
    }
  },

  _registerListeners() {
    this._listenersRegistered = true;
    console.log('[AdManager] Registering ad event listeners');

    // ─── Banner listeners ───
    AdMob.addListener('bannerAdLoaded', () => {
      console.log('[AdManager] ✅ Banner ad loaded');
      this._bannerRetryCount = 0;
    });

    AdMob.addListener('bannerAdFailedToLoad', (info) => {
      console.warn('[AdManager] ❌ Banner FAILED to load:', JSON.stringify(info));
      bannerShowing = false;
      // Retry after delay
      if (this._bannerRetryCount < MAX_RETRY_ATTEMPTS) {
        this._bannerRetryCount++;
        console.log(`[AdManager] Banner retry ${this._bannerRetryCount}/${MAX_RETRY_ATTEMPTS} in ${RETRY_DELAY_MS}ms`);
        setTimeout(() => this.showBanner(), RETRY_DELAY_MS);
      }
    });

    // ─── Interstitial listeners ───
    AdMob.addListener('interstitialAdLoaded', () => {
      console.log('[AdManager] ✅ Interstitial ad loaded');
      interstitialLoaded = true;
      this._interstitialRetryCount = 0;
    });

    AdMob.addListener('interstitialAdFailedToLoad', (info) => {
      console.warn('[AdManager] ❌ Interstitial FAILED to load:', JSON.stringify(info));
      interstitialLoaded = false;
      this._isShowing = false;
      if (this._interstitialCallback) {
        this._interstitialCallback();
        this._interstitialCallback = null;
      }
      // Retry
      if (this._interstitialRetryCount < MAX_RETRY_ATTEMPTS) {
        this._interstitialRetryCount++;
        console.log(`[AdManager] Interstitial retry ${this._interstitialRetryCount}/${MAX_RETRY_ATTEMPTS}`);
        setTimeout(() => this.prepareInterstitial(), RETRY_DELAY_MS);
      }
    });

    AdMob.addListener('interstitialAdShowed', () => {
      console.log('[AdManager] Interstitial ad showed');
    });

    AdMob.addListener('interstitialAdFailedToShow', (info) => {
      console.warn('[AdManager] ❌ Interstitial FAILED to show:', JSON.stringify(info));
      this._isShowing = false;
      this._restoreInput();
      this.prepareInterstitial();
      if (this._interstitialCallback) {
        this._interstitialCallback();
        this._interstitialCallback = null;
      }
    });

    AdMob.addListener('interstitialAdDismissed', () => {
      console.log('[AdManager] Interstitial dismissed');
      this._isShowing = false;
      this._lastInterstitialTime = Date.now();
      this._restoreInput();
      this.prepareInterstitial();
      if (this._interstitialCallback) {
        this._interstitialCallback();
        this._interstitialCallback = null;
      }
    });
  },

  async prepareInterstitial() {
    if (!admobInitialized) return;
    this._interstitialRetryCount = 0; // Reset retry count so it always tries again

    try {
      console.log('[AdManager] Preparing interstitial...');
      await AdMob.prepareInterstitial({
        adId: getAdId('interstitial'),
        isTesting: USE_TEST_IDS,
      });
      interstitialLoaded = true;
      console.log('[AdManager] ✅ Interstitial prepared');
    } catch (e) {
      console.warn('[AdManager] Interstitial prepare failed:', e.message || e);
      interstitialLoaded = false;
    }
  },

  /**
   * Show interstitial ad.
   * On native: shows real ad or skips if not loaded (NO placeholder).
   * On web: shows placeholder for testing.
   */
  async showInterstitial(scene, onComplete) {
    if (this._isShowing) {
      onComplete();
      return;
    }

    // On native platform — only show real ads, never placeholders
    if (this._isNativePlatform()) {
      if (admobInitialized && interstitialLoaded) {
        this._isShowing = true;
        try {
          interstitialLoaded = false;
          this._interstitialCallback = onComplete;
          console.log('[AdManager] Showing interstitial...');
          await AdMob.showInterstitial();
        } catch (e) {
          console.warn('[AdManager] Interstitial show error:', e.message || e);
          this._isShowing = false;
          this._interstitialCallback = null;
          this.prepareInterstitial();
          onComplete();
        }
      } else {
        // Ad not ready on native — just skip, don't show placeholder
        console.log('[AdManager] Interstitial not ready, skipping (native)');
        this.prepareInterstitial(); // Try to load for next time
        onComplete();
      }
    } else {
      // Web/dev — show placeholder for testing
      this._showPlaceholderInterstitial(scene, onComplete);
    }
  },

  async showBanner() {
    this._bannerRetryCount = 0; // Reset retry count whenever requested
    if (bannerShowing) return;

    if (!this._isNativePlatform()) {
      console.log('[AdManager] Banner skipped (not native platform)');
      return;
    }

    if (!admobInitialized) {
      console.warn('[AdManager] Cannot show banner — not initialized yet');
      return;
    }

    try {
      const adId = getAdId('banner');
      console.log('[AdManager] Showing banner with ID:', adId);
      await AdMob.showBanner({
        adId: adId,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: USE_TEST_IDS,
      });
      bannerShowing = true;
      console.log('[AdManager] ✅ Banner show request sent');
    } catch (e) {
      console.warn('[AdManager] ❌ Banner show failed:', e.message || e);
      console.warn('[AdManager] Banner error details:', JSON.stringify(e));
    }
  },

  async hideBanner() {
    if (!bannerShowing) return;

    try {
      await AdMob.hideBanner();
      bannerShowing = false;
    } catch (e) {
      console.warn('[AdManager] Banner hide failed:', e.message || e);
    }
  },

  // ═══════════════════════════════════════════════
  // PLACEHOLDER ADS (Web/Dev only — never on native)
  // ═══════════════════════════════════════════════

  _showPlaceholderInterstitial(scene, onComplete) {
    this._isShowing = true;
    const { width, height } = scene.scale;

    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setDepth(200).setInteractive();

    const boxW = width * 0.8, boxH = height * 0.4;
    const boxX = (width - boxW) / 2, boxY = (height - boxH) / 2;

    const box = scene.add.graphics().setDepth(201);
    box.fillStyle(0x2a2a4e, 1);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 16);

    const adText = scene.add.text(width / 2, height / 2 - 20, 'Ad Placeholder', {
      fontSize: '24px', fontFamily: '"Fredoka", sans-serif', color: '#ffffff'
    }).setOrigin(0.5).setDepth(202);

    const subText = scene.add.text(width / 2, height / 2 + 15, 'Real ads appear on device', {
      fontSize: '14px', fontFamily: '"Fredoka", sans-serif', color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(202);

    let remaining = 3;
    const timerText = scene.add.text(width / 2, boxY + boxH - 40, `Skip in ${remaining}...`, {
      fontSize: '16px', fontFamily: '"Fredoka", sans-serif', color: '#FFD32A'
    }).setOrigin(0.5).setDepth(202);

    const countdown = scene.time.addEvent({
      delay: 1000, repeat: 2,
      callback: () => {
        remaining--;
        timerText.setText(remaining > 0 ? `Skip in ${remaining}...` : '');
      }
    });

    scene.time.delayedCall(3000, () => {
      const skipBtn = scene.add.text(width / 2, boxY + boxH - 40, 'CONTINUE', {
        fontSize: '20px', fontFamily: '"Fredoka", sans-serif', color: '#4ECDC4'
      }).setOrigin(0.5).setDepth(203).setInteractive({ useHandCursor: true });

      timerText.setVisible(false);
      countdown.remove();

      const cleanup = () => {
        overlay.destroy(); box.destroy(); adText.destroy();
        subText.destroy(); timerText.destroy(); skipBtn.destroy();
        this._isShowing = false;
        this._lastInterstitialTime = Date.now();
        onComplete();
      };

      skipBtn.on('pointerdown', cleanup);
      scene.time.delayedCall(5000, () => { if (this._isShowing) cleanup(); });
    });
  }
};
