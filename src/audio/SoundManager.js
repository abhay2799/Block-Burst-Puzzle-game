import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

let soundEnabled = true;
let musicEnabled = true;
let hapticsEnabled = true;
let soundManager = null;
let currentBGM = null;

try {
  if (localStorage.getItem('blockblast_sound') === 'false') soundEnabled = false;
  if (localStorage.getItem('blockblast_music') === 'false') musicEnabled = false;
  if (localStorage.getItem('blockblast_haptics') === 'false') hapticsEnabled = false;
} catch (e) { /* ignore */ }

function playSFX(key) {
  if (!soundEnabled || document.hidden || !soundManager) return;
  try {
    soundManager.play(key);
  } catch (e) { /* audio context not ready */ }
}

async function vibrate(pattern) {
  if (!hapticsEnabled) return;
  try {
    if (Capacitor.isNativePlatform()) {
      // Use native async haptics so it NEVER blocks the WebGL rendering thread
      if (Array.isArray(pattern) && pattern.length > 3) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (Array.isArray(pattern) && pattern[0] > 20) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } else {
      // Fallback for web
      if (navigator.vibrate) navigator.vibrate(pattern);
    }
  } catch (e) { /* not supported */ }
}

function delayedPlay(key, delay) {
  setTimeout(() => {
    if (!document.hidden && soundEnabled && soundManager) {
      try {
        soundManager.play(key);
      } catch (e) {}
    }
  }, delay);
}

function speakVoice(text) {
  if (!soundEnabled || !window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1.1; // Slightly faster for game pacing
  msg.pitch = 1.2; // Slightly higher pitch for enthusiasm
  window.speechSynthesis.speak(msg);
}

function stopSFX(key) {
  if (!soundManager) return;
  try {
    const sounds = soundManager.getAll(key);
    if (sounds && sounds.length) {
      sounds.forEach(s => s.stop());
    }
  } catch (e) {}
}

export const SoundManager = {
  init(scene) {
    if (scene && scene.sound) {
      soundManager = scene.sound;
    }
  },

  isSoundEnabled() { return soundEnabled; },
  isMusicEnabled() { return musicEnabled; },
  isHapticsEnabled() { return hapticsEnabled; },

  playSplash() {
    // Unlike SFX, splash should play at full requested volume if sound is enabled
    if (soundEnabled && soundManager) {
      try {
        soundManager.play('devlanceStudio', { volume: 1.0 });
      } catch (e) {}
    }
  },

  toggleSound() {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('blockblast_sound', soundEnabled.toString()); } catch (e) {}
    return soundEnabled;
  },

  toggleMusic() {
    musicEnabled = !musicEnabled;
    try { localStorage.setItem('blockblast_music', musicEnabled.toString()); } catch (e) {}
    
    if (!musicEnabled && currentBGM) {
      currentBGM.pause();
    } else if (musicEnabled && currentBGM) {
      if (currentBGM.isPaused) currentBGM.resume();
      else if (!currentBGM.isPlaying) currentBGM.play();
    }
    return musicEnabled;
  },

  toggleHaptics() {
    hapticsEnabled = !hapticsEnabled;
    try { localStorage.setItem('blockblast_haptics', hapticsEnabled.toString()); } catch (e) {}
    if (hapticsEnabled) vibrate(15);
    return hapticsEnabled;
  },

  playBGM() {
    if (!soundManager || document.hidden) return;
    
    const startBGM = () => {
      if (!currentBGM) {
        try {
          currentBGM = soundManager.add('bgm', { loop: true, volume: 0.08 });
          if (musicEnabled) {
            currentBGM.play();
          }
        } catch (e) {}
      } else if (!currentBGM.isPlaying && musicEnabled) {
        currentBGM.play();
      }
    };

    if (soundManager.locked) {
      soundManager.once('unlocked', startBGM);
    } else {
      startBGM();
    }
  },

  stopBGM() {
    if (currentBGM) {
      currentBGM.stop();
    }
  },

  speak(text) {
    speakVoice(text);
  },

  piecePickup() {
    if (soundEnabled && soundManager) {
      soundManager.play('pieceInvalid', { rate: 1.2, volume: 0.8 }); // Pop sound
    }
    vibrate([15, 25, 15]);
  },

  playGameStart() {
    playSFX('gameStart');
    vibrate([30, 50, 30, 80]);
  },

  startDragSound() {
    if (!soundEnabled || !soundManager) return;
    if (!this.dragLoop) {
      this.dragLoop = soundManager.add('dragSound', { loop: true, volume: 0 });
      this.dragLoop.play();
    } else if (!this.dragLoop.isPlaying) {
      this.dragLoop.play();
      this.dragLoop.setVolume(0);
    }
  },

  updateDragSound(isInsideBox, speed) {
    if (!soundEnabled || !this.dragLoop || !this.dragLoop.isPlaying) return;

    if (isInsideBox && speed > 0.02) {
      this.dragLoop.setVolume(0.8);
      if (this.dragLoop.setRate) {
        this.dragLoop.setRate(1.0 + (speed > 1 ? 0.2 : speed * 0.2));
      }
    } else {
      this.dragLoop.setVolume(0);
    }
  },

  stopDragSound() {
    if (this.dragLoop && this.dragLoop.isPlaying) {
      this.dragLoop.stop();
    }
  },

  piecePlace() {
    if (soundEnabled && soundManager) {
      soundManager.play('pieceInvalid', { rate: 0.8, volume: 1.2 });
    }
    vibrate([30, 20, 50]);
  },

  pieceInvalid() {
    playSFX('pieceInvalid');
    vibrate([40, 20, 40, 15, 30]);
  },

  handleClearSound(lineCount, comboLevel, clears) {
    if (lineCount === 0) return;

    let played = false;

    // 1. Horizontal lines only
    if (clears && clears.rows && clears.cols) {
      if (clears.rows.length > 0 && clears.cols.length === 0) {
        // Creative horizontal clear: a pitch-shifted double-tap of the vertical sound!
        if (soundEnabled && soundManager) {
          try {
            soundManager.play('smallBreak', { rate: 0.85, volume: 1.2 });
            setTimeout(() => {
              if (soundManager && soundEnabled && !document.hidden) {
                soundManager.play('smallBreak', { rate: 1.15, volume: 0.9 });
              }
            }, 60); // Quick 60ms delay for a satisfying "wide" echo effect
          } catch(e) {}
        }
        vibrate([40, 60, 40, 30, 70]);
        played = true;
      }
    }

    // 2. Combo / Small Breaks
    if (!played) {
      if (comboLevel === 2) { // First combo clear
        playSFX('combo1');
        vibrate([30, 20, 40]);
      } else if (comboLevel === 3) { // Second combo clear
        playSFX('combo2');
        vibrate([40, 20, 50, 20, 60]);
      } else if (comboLevel > 3) { // Random for huge combos
        const randomCombo = ['combo1', 'combo2', 'smallBreak'][Math.floor(Math.random() * 3)];
        playSFX(randomCombo);
        vibrate([50, 30, 60, 20, 80]);
      } else { // Single lines or standard vertical clear
        playSFX('smallBreak');
        vibrate([25, 15, 35]);
      }
    }
  },

  levelComplete() {
    if (soundEnabled && soundManager) {
      try { soundManager.play('combo2'); } catch(e) {}
    }
    vibrate([30, 40, 30, 50, 30, 60, 100]);
  },

  gameOver() {
    if (soundEnabled && soundManager) {
      try { soundManager.play('gameOver', { volume: 1.0 }); } catch(e) {}
    }
    vibrate([80, 60, 120, 60, 200]);
  },

  noSpace() {
    if (soundEnabled && soundManager) {
      try { soundManager.play('noSpace', { volume: 1.0 }); } catch(e) {}
    }
    vibrate([80, 40, 120]);
  },

  highScore() {
    if (soundEnabled && soundManager) {
      try { soundManager.play('highScore', { volume: 1.0 }); } catch(e) {}
    }
    vibrate([40, 30, 50, 30, 60, 40, 100]);
  },

  buttonClick() {
    if (soundEnabled && soundManager) {
      try { soundManager.play('buttonClick', { volume: 1.0 }); } catch(e) {}
    }
  },

  newTurn() {
    // Disabled as requested
    vibrate(10);
  },

  uiClick() {
    if (soundEnabled && soundManager) {
      try { soundManager.play('buttonClick', { volume: 1.0 }); } catch(e) {}
    }
    vibrate([15, 10, 15]);
  },

  scorePop() {
    // Disabled as requested
  }
};
