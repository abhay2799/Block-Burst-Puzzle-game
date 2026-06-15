/**
 * AdManager - Real AdMob integration via @capacitor-community/admob.
 *
 * Ad Unit ID Configuration:
 * --------------------------
 * Set `USE_TEST_IDS = true` during development.
 * Before release, set `USE_TEST_IDS = false` and replace the production IDs below
 * with your actual AdMob ad unit IDs from https://apps.admob.com
 *
 * Test IDs are Google's official test ad unit IDs that always return test ads.
 *
 * PRODUCTION DEPLOYMENT:
 * 1. Set USE_TEST_IDS = false
 * 2. Replace production IDs in AD_IDS with your actual AdMob unit IDs
 * 3. Verify testingDevices array is empty for production
 * 4. Build: npm run build && npx cap sync android
 * 5. Test on physical device before publishing
 */

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
  rewarded: {
    production: 'ca-app-pub-3214717672189600/REWARDED_ID_HERE',
    test: 'ca-app-pub-3940256099942544/5224354917',
  },
};

function getAdId(type) {
  return USE_TEST_IDS ? AD_IDS[type].test : AD_IDS[type].production;
}

import { AdMob } from '@capacitor-community/admob';

let admobPlugin = AdMob;
let admobInitialized = false;
let interstitialLoaded = false;
let rewardedLoaded = false;
let bannerShowing = false;

function getAdMob() {
  return admobPlugin;
}

export const AdManager = {
  COPPA_CHILD_DIRECTED: true,
  _isShowing: false,
  _lastInterstitialTime: 0,
  MIN_INTERSTITIAL_INTERVAL: 180000,
  _listenersRegistered: false,
  _gameOverCount: 0,
  _gameInstance: null,

  _restoreInput() {
    if (this._gameInstance) {
      const scenes = this._gameInstance.scene.getScenes(true);
      for (const scene of scenes) {
        if (scene.input) {
          scene.input.enabled = true;
        }
      }
    }
  },

  shouldShowGameOverAd() {
    return true;
  },

  async initialize() {
    const AdMob = getAdMob();
    if (!AdMob) { console.warn('[AdManager] AdMob plugin not available'); return false; }

    try {
      console.log('[AdManager] Initializing AdMob...');
      await AdMob.initialize({
        requestTrackingAuthorization: false,
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
        testingDevices: [],
      });
      admobInitialized = true;
      console.log('[AdManager] AdMob initialized successfully');

      if (!this._listenersRegistered) {
        this._listenersRegistered = true;
        AdMob.addListener('interstitialAdDismissed', () => {
          this._isShowing = false;
          this._lastInterstitialTime = Date.now();
          this.prepareInterstitial();
          this._restoreInput();
          if (this._interstitialCallback) { this._interstitialCallback(); this._interstitialCallback = null; }
        });
        AdMob.addListener('interstitialAdFailedToLoad', () => {
          interstitialLoaded = false;
          this._isShowing = false;
          if (this._interstitialCallback) { this._interstitialCallback(); this._interstitialCallback = null; }
        });
        AdMob.addListener('interstitialAdFailedToShow', () => {
          this._isShowing = false;
          this.prepareInterstitial();
          if (this._interstitialCallback) { this._interstitialCallback(); this._interstitialCallback = null; }
        });
        AdMob.addListener('onRewardedVideoAdReward', () => {
          this._isShowing = false;
          this.prepareRewarded();
          this._restoreInput();
          if (this._rewardCallback) { this._rewardCallback(); this._rewardCallback = null; }
        });
        AdMob.addListener('onRewardedVideoAdDismissed', () => {
          this._isShowing = false;
          this.prepareRewarded();
          this._restoreInput();
          if (this._dismissCallback) { this._dismissCallback(); this._dismissCallback = null; }
        });
      }

      this.prepareInterstitial();
      this.prepareRewarded();
      return true;
    } catch (e) {
      console.warn('AdMob init failed:', e.message);
      return false;
    }
  },

  async prepareInterstitial() {
    const AdMob = getAdMob();
    if (!AdMob || !admobInitialized) return;

    try {
      await AdMob.prepareInterstitial({
        adId: getAdId('interstitial'),
        isTesting: USE_TEST_IDS,
      });
      interstitialLoaded = true;
    } catch (e) {
      console.warn('Interstitial prepare failed:', e.message);
      interstitialLoaded = false;
    }
  },

  async prepareRewarded() {
    const AdMob = getAdMob();
    if (!AdMob || !admobInitialized) return;

    try {
      await AdMob.prepareRewardVideoAd({
        adId: getAdId('rewarded'),
        isTesting: USE_TEST_IDS,
      });
      rewardedLoaded = true;
    } catch (e) {
      console.warn('Rewarded prepare failed:', e.message);
      rewardedLoaded = false;
    }
  },

  /**
   * Show interstitial ad between levels.
   * Falls back to placeholder UI when AdMob is not available (web/dev).
   */
  async showInterstitial(scene, onComplete) {
    if (this._isShowing) { onComplete(); return; }

    this._isShowing = true;
    const AdMob = getAdMob();

    if (AdMob && admobInitialized && interstitialLoaded) {
      try {
        interstitialLoaded = false;
        this._interstitialCallback = onComplete;
        await AdMob.showInterstitial();
      } catch (e) {
        this._isShowing = false;
        this._interstitialCallback = null;
        this.prepareInterstitial();
        onComplete();
      }
    } else {
      this._showPlaceholderInterstitial(scene, onComplete);
    }
  },

  /**
   * Show rewarded ad (user opts in for bonus).
   * Returns true if reward was earned, false otherwise.
   */
  async showRewarded(scene, onReward, onDismiss) {
    if (this._isShowing) { onDismiss(); return; }

    this._isShowing = true;
    const AdMob = getAdMob();

    if (AdMob && admobInitialized && rewardedLoaded) {
      try {
        this._rewardCallback = onReward;
        this._dismissCallback = onDismiss;
        await AdMob.showRewardVideoAd();
      } catch (e) {
        this._isShowing = false;
        this._rewardCallback = null;
        this._dismissCallback = null;
        this.prepareRewarded();
        onDismiss();
      }
    } else {
      this._showPlaceholderRewarded(scene, onReward, onDismiss);
    }
  },

  async showBanner() {
    if (bannerShowing) return;

    const AdMob = getAdMob();
    if (!AdMob || !admobInitialized) { console.warn('[AdManager] Cannot show banner - not initialized'); return; }

    try {
      const adId = getAdId('banner');
      console.log('[AdManager] Showing banner with ID:', adId);
      await AdMob.showBanner({
        adId,
        adSize: 'BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: USE_TEST_IDS,
      });
      bannerShowing = true;
      console.log('[AdManager] Banner shown successfully');
    } catch (e) {
      console.warn('[AdManager] Banner show failed:', e.message);
    }
  },

  async hideBanner() {
    if (!bannerShowing) return;

    const AdMob = getAdMob();
    if (!AdMob) return;

    try {
      await AdMob.hideBanner();
      bannerShowing = false;
    } catch (e) {
      console.warn('Banner hide failed:', e.message);
    }
  },

  isRewardedReady() {
    return rewardedLoaded;
  },

  _showPlaceholderInterstitial(scene, onComplete) {
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
  },

  _showPlaceholderRewarded(scene, onReward, onDismiss) {
    const { width, height } = scene.scale;

    const overlay = scene.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, width, height);

    const adText = scene.add.text(width / 2, height / 2 - 30, 'Rewarded Ad Placeholder', {
      fontSize: '22px', fontFamily: '"Fredoka", sans-serif', color: '#FFD32A'
    }).setOrigin(0.5).setDepth(202);

    const subText = scene.add.text(width / 2, height / 2 + 10, 'Watch to earn reward', {
      fontSize: '14px', fontFamily: '"Fredoka", sans-serif', color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(202);

    scene.time.delayedCall(2000, () => {
      const claimBtn = scene.add.text(width / 2, height / 2 + 60, 'CLAIM REWARD', {
        fontSize: '20px', fontFamily: '"Fredoka", sans-serif', color: '#2ED573'
      }).setOrigin(0.5).setDepth(203).setInteractive({ useHandCursor: true });

      const cleanup = () => {
        overlay.destroy(); adText.destroy(); subText.destroy(); claimBtn.destroy();
        this._isShowing = false;
      };

      claimBtn.on('pointerdown', () => { cleanup(); onReward(); });
      scene.time.delayedCall(10000, () => { if (this._isShowing) { cleanup(); onDismiss(); } });
    });
  }
};
