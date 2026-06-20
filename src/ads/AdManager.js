/**
 * AdManager - Real AdMob integration via @capacitor-community/admob.
 *
 * PRODUCTION AD UNIT IDS:
 * Banner:       ca-app-pub-3214717672189600/3883361100
 * Interstitial:  ca-app-pub-3214717672189600/7614036794
 */
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents } from '@capacitor-community/admob';

// ═══════════════════════════════════════════════
// PRODUCTION AD UNIT IDS
// ═══════════════════════════════════════════════
const AD_IDS = {
  banner: 'ca-app-pub-3214717672189600/3883361100',
  interstitial: 'ca-app-pub-3214717672189600/7614036794',
  rewarded: 'ca-app-pub-3214717672189600/9393296941'
};

function getAdId(type) {
  return AD_IDS[type];
}

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let admobInitialized = false;
let interstitialLoaded = false;
let rewardedLoaded = false;
let bannerShowing = false;
let bannerCreated = false;
let initializationInProgress = false;

// Retry config
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

export const AdManager = {
  _isShowing: false,
  _lastInterstitialTime: 0,
  MIN_INTERSTITIAL_INTERVAL: 0, // Removed interval per user request
  _listenersRegistered: false,
  _gameOverCount: 0,
  _gameInstance: null,
  _interstitialRetryCount: 0,
  _rewardedRetryCount: 0,
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
    return true; // Always show on Game Over
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
      console.log('[AdManager] Mode: PRODUCTION (Test Ads Disabled)');
      console.log('[AdManager] Banner ID:', getAdId('banner'));
      console.log('[AdManager] Interstitial ID:', getAdId('interstitial'));
      console.log('[AdManager] Rewarded ID:', getAdId('rewarded'));

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

      // Pre-load ads
      this.prepareInterstitial();
      this.prepareRewardVideoAd();

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

    AdMob.addListener('bannerAdFailedToLoad', async (info) => {
      console.warn('[AdManager] ❌ Banner FAILED to load:', JSON.stringify(info));
      
      // Temporary: Show exact AdMob error on screen for debugging
      alert("Banner Ad Failed to Load: " + JSON.stringify(info));

      bannerShowing = false;
      bannerCreated = false;
      try { await AdMob.removeBanner(); } catch(e) {}
      // AdMob often returns 'No Fill' when rate-limiting.
      // We continuously retry every 15s in the background. When AdMob lifts the limit, it will seamlessly appear.
      setTimeout(() => this.showBanner(), 15000);
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
      bannerShowing = false; // Mark as false so showBanner() runs resumeBanner() when dismissed
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
      setTimeout(() => this.showBanner(), 500); // Trigger resumeBanner safely
    });

    // ─── Rewarded Video listeners ───
    AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
      console.log('[AdManager] ✅ Rewarded ad loaded');
      rewardedLoaded = true;
      this._rewardedRetryCount = 0;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (info) => {
      console.warn('[AdManager] ❌ Rewarded FAILED to load:', JSON.stringify(info));
      rewardedLoaded = false;
      this._isShowing = false;
      if (this._rewardCallback) {
        this._rewardCallback(false);
        this._rewardCallback = null;
      }
      if (this._rewardedRetryCount < MAX_RETRY_ATTEMPTS) {
        this._rewardedRetryCount++;
        setTimeout(() => this.prepareRewardVideoAd(), RETRY_DELAY_MS);
      }
    });

    AdMob.addListener(RewardAdPluginEvents.Showed, () => {
      console.log('[AdManager] Rewarded ad showed');
      bannerShowing = false; // Mark as false so showBanner() runs resumeBanner() when dismissed
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToShow, (info) => {
      console.warn('[AdManager] ❌ Rewarded FAILED to show:', JSON.stringify(info));
      this._isShowing = false;
      this._restoreInput();
      this.prepareRewardVideoAd();
      if (this._rewardCallback) {
        this._rewardCallback(false);
        this._rewardCallback = null;
      }
    });

    AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem) => {
      console.log('[AdManager] User earned reward:', rewardItem);
      this._userEarnedReward = true;
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      console.log('[AdManager] Rewarded ad dismissed');
      this._isShowing = false;
      this._restoreInput();
      this.prepareRewardVideoAd();
      if (this._rewardCallback) {
        this._rewardCallback(this._userEarnedReward);
        this._rewardCallback = null;
      }
      setTimeout(() => this.showBanner(), 500); // Trigger resumeBanner safely
    });
  },

  resetAdCounters() {
    this._interstitialRetryCount = 0;
    this._bannerRetryCount = 0;
    this._rewardedRetryCount = 0;
  },

  async prepareInterstitial() {
    if (!admobInitialized) return;

    try {
      console.log('[AdManager] Preparing interstitial...');
      await AdMob.prepareInterstitial({
        adId: getAdId('interstitial')
      });
      // We rely on 'interstitialAdLoaded' listener to set interstitialLoaded = true
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

  async prepareRewardVideoAd() {
    if (!admobInitialized) return;

    try {
      console.log('[AdManager] Preparing rewarded video...');
      await AdMob.prepareRewardVideoAd({
        adId: getAdId('rewarded')
      });
      // We rely on 'RewardAdPluginEvents.Loaded' listener to set rewardedLoaded = true
    } catch (e) {
      console.warn('[AdManager] Rewarded video prepare failed:', e.message || e);
      rewardedLoaded = false;
    }
  },

  async showRewardVideoAd(scene, onComplete) {
    if (this._isShowing) {
      onComplete(false);
      return;
    }

    if (this._isNativePlatform()) {
      if (admobInitialized && rewardedLoaded) {
        this._isShowing = true;
        this._userEarnedReward = false;
        try {
          rewardedLoaded = false;
          this._rewardCallback = onComplete;
          console.log('[AdManager] Showing rewarded video...');
          await AdMob.showRewardVideoAd();
        } catch (e) {
          console.warn('[AdManager] Rewarded video show error:', e.message || e);
          this._isShowing = false;
          this._rewardCallback = null;
          this.prepareRewardVideoAd();
          onComplete(false);
        }
      } else {
        console.log('[AdManager] Rewarded video not ready, skipping (native)');
        this.prepareRewardVideoAd();
        onComplete(false); // Ad not ready, no reward
      }
    } else {
      // Web/dev — show placeholder
      this._showPlaceholderRewardVideo(scene, onComplete);
    }
  },

  async showBanner() {
    if (bannerShowing) return;

    if (!this._isNativePlatform()) {
      console.log('[AdManager] Showing web placeholder for Banner Ad');
      let placeholder = document.getElementById('ad-banner-placeholder');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = 'ad-banner-placeholder';
        placeholder.style.position = 'fixed';
        placeholder.style.bottom = '0';
        placeholder.style.left = '50%';
        placeholder.style.transform = 'translateX(-50%)';
        placeholder.style.width = '100%';
        placeholder.style.maxWidth = '400px'; // Typical banner ad width
        placeholder.style.height = '50px'; // Typical banner ad height
        placeholder.style.backgroundColor = '#2a2a4e';
        placeholder.style.color = '#ffffff';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.fontFamily = '"Fredoka", "Baloo 2", sans-serif';
        placeholder.style.fontSize = '14px';
        placeholder.style.zIndex = '9999';
        placeholder.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.5)';
        placeholder.innerText = 'AD PLACEHOLDER (AdMob Banner)';
        document.body.appendChild(placeholder);
      }
      placeholder.style.display = 'flex';
      bannerShowing = true;
      return;
    }

    if (!admobInitialized) {
      console.warn('[AdManager] Cannot show banner — not initialized yet');
      return;
    }

    try {
      if (bannerCreated) {
        // Safely resume instead of recreating to prevent duplicate view crashes
        await AdMob.resumeBanner();
        bannerShowing = true;
        console.log('[AdManager] ✅ Banner resumed safely');
        return;
      }
    } catch (resumeError) {
      console.warn('[AdManager] Failed to resume banner, recreating...');
    }

    // Fall back to creating it
    try {
      const adId = getAdId('banner');
      console.log('[AdManager] Showing banner with ID:', adId);
      await AdMob.showBanner({
        adId: adId,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER
      });
      bannerShowing = true;
      bannerCreated = true;
      console.log('[AdManager] ✅ Banner show request sent');
    } catch (e) {
      console.warn('[AdManager] ❌ Banner show failed:', e.message || e);
    }
  },

  async hideBanner() {
    if (!bannerShowing) return;

    if (!this._isNativePlatform()) {
      const placeholder = document.getElementById('ad-banner-placeholder');
      if (placeholder) {
        placeholder.style.display = 'none';
      }
      bannerShowing = false;
      return;
    }

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
      fontSize: '24px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#ffffff'
    }).setOrigin(0.5).setDepth(202);

    const subText = scene.add.text(width / 2, height / 2 + 15, 'Real ads appear on device', {
      fontSize: '14px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(202);

    let remaining = 3;
    const timerText = scene.add.text(width / 2, boxY + boxH - 40, `Skip in ${remaining}...`, {
      fontSize: '16px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#FFD32A'
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
        fontSize: '20px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#4ECDC4'
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
  },

  _showPlaceholderRewardVideo(scene, onComplete) {
    this._isShowing = true;
    const { width, height } = scene.scale;

    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setDepth(200).setInteractive();

    const boxW = width * 0.8, boxH = height * 0.4;
    const boxX = (width - boxW) / 2, boxY = (height - boxH) / 2;

    const box = scene.add.graphics().setDepth(201);
    box.fillStyle(0x3a2a4e, 1);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 16);

    const adText = scene.add.text(width / 2, height / 2 - 30, 'REWARDED AD PLACEHOLDER', {
      fontSize: '20px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#FFD32A'
    }).setOrigin(0.5).setDepth(202);

    const subText = scene.add.text(width / 2, height / 2 + 10, 'Watch this 5s video to get a reward!', {
      fontSize: '14px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#ffffff'
    }).setOrigin(0.5).setDepth(202);

    let remaining = 5;
    const timerText = scene.add.text(width / 2, boxY + boxH - 40, `Reward in ${remaining}...`, {
      fontSize: '16px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#4ECDC4'
    }).setOrigin(0.5).setDepth(202);

    const countdown = scene.time.addEvent({
      delay: 1000, repeat: 4,
      callback: () => {
        remaining--;
        timerText.setText(remaining > 0 ? `Reward in ${remaining}...` : '');
      }
    });

    scene.time.delayedCall(5000, () => {
      const claimBtn = scene.add.text(width / 2, boxY + boxH - 40, 'CLAIM REWARD', {
        fontSize: '20px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#FFD32A'
      }).setOrigin(0.5).setDepth(203).setInteractive({ useHandCursor: true });

      const closeBtn = scene.add.text(width / 2, boxY + boxH - 10, 'Close Video (No Reward)', {
        fontSize: '12px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#aaaaaa'
      }).setOrigin(0.5).setDepth(203).setInteractive({ useHandCursor: true });

      timerText.setVisible(false);
      countdown.remove();

      const cleanup = (granted) => {
        overlay.destroy(); box.destroy(); adText.destroy();
        subText.destroy(); timerText.destroy(); claimBtn.destroy(); closeBtn.destroy();
        this._isShowing = false;
        onComplete(granted);
      };

      claimBtn.on('pointerdown', () => cleanup(true));
      closeBtn.on('pointerdown', () => cleanup(false));
    });
  }
};
