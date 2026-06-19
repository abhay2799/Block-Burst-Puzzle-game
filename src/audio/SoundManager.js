let muted = false;
let soundManager = null;
let currentBGM = null;

try {
  const savedMute = localStorage.getItem('blockblast_muted');
  if (savedMute === 'true') muted = true;
} catch (e) { /* ignore */ }

function playSFX(key) {
  if (muted || document.hidden || !soundManager) return;
  try {
    soundManager.play(key);
  } catch (e) { /* audio context not ready */ }
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* not supported */ }
}

function delayedPlay(key, delay) {
  setTimeout(() => {
    if (!document.hidden && !muted && soundManager) {
      try {
        soundManager.play(key);
      } catch (e) {}
    }
  }, delay);
}

function speakVoice(text) {
  if (muted || !window.speechSynthesis) return;
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
    if (!soundManager && scene && scene.sound) {
      soundManager = scene.sound;
    }
  },

  isMuted() {
    return muted;
  },

  toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem('blockblast_muted', muted.toString());
    } catch (e) { /* ignore */ }

    if (muted && currentBGM) {
      currentBGM.pause();
    } else if (!muted && currentBGM) {
      currentBGM.resume();
    }

    return muted;
  },

  setMuted(val) {
    muted = val;
    try {
      localStorage.setItem('blockblast_muted', muted.toString());
    } catch (e) { /* ignore */ }

    if (muted && currentBGM) {
      currentBGM.pause();
    } else if (!muted && currentBGM) {
      currentBGM.resume();
    }
  },

  playBGM() {
    if (!soundManager || document.hidden) return;
    
    const startBGM = () => {
      if (!currentBGM) {
        try {
          currentBGM = soundManager.add('bgm', { loop: true, volume: 0.08 });
          if (!muted) {
            currentBGM.play();
          }
        } catch (e) {}
      } else if (!currentBGM.isPlaying && !muted) {
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
    if (soundManager) {
      soundManager.play('pieceInvalid', { rate: 1.2, volume: 0.8 }); // Pop sound
    }
    vibrate(15);
  },

  playGameStart() {
    playSFX('gameStart');
    vibrate([20, 40, 20, 60]);
  },

  startDragSound() {
    if (!soundManager) return;
    if (!this.dragLoop) {
      this.dragLoop = soundManager.add('dragSound', { loop: true, volume: 0 });
      this.dragLoop.play();
    } else if (!this.dragLoop.isPlaying) {
      this.dragLoop.play();
      this.dragLoop.setVolume(0);
    }
  },

  updateDragSound(isInsideBox, speed) {
    if (!this.dragLoop || !this.dragLoop.isPlaying) return;

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
    if (soundManager) {
      soundManager.play('pieceInvalid', { rate: 0.8, volume: 1.2 });
    }
    vibrate([20, 15, 35]);
  },

  pieceInvalid() {
    playSFX('pieceInvalid');
    vibrate([30, 10, 30]);
  },

  handleClearSound(lineCount, comboLevel, clears) {
    if (lineCount === 0) return;

    let played = false;

    // 1. Horizontal lines only
    if (clears && clears.rows && clears.cols) {
      if (clears.rows.length > 0 && clears.cols.length === 0) {
        // Creative horizontal clear: a pitch-shifted double-tap of the vertical sound!
        if (soundManager) {
          try {
            soundManager.play('smallBreak', { rate: 0.85, volume: 1.2 });
            setTimeout(() => {
              if (soundManager && !muted && !document.hidden) {
                soundManager.play('smallBreak', { rate: 1.15, volume: 0.9 });
              }
            }, 60); // Quick 60ms delay for a satisfying "wide" echo effect
          } catch(e) {}
        }
        vibrate([30, 50, 30]);
        played = true;
      }
    }

    // 2. Combo / Small Breaks
    if (!played) {
      if (comboLevel === 2) { // First combo clear
        playSFX('combo1');
        vibrate([20, 10, 20]);
      } else if (comboLevel === 3) { // Second combo clear
        playSFX('combo2');
        vibrate([30, 15, 30]);
      } else if (comboLevel > 3) { // Random for huge combos
        const randomCombo = ['combo1', 'combo2', 'smallBreak'][Math.floor(Math.random() * 3)];
        playSFX(randomCombo);
        vibrate([40, 20, 40]);
      } else { // Single lines or standard vertical clear
        playSFX('smallBreak');
        vibrate([15, 10]);
      }
    }
  },

  levelComplete() {
    if (!muted && soundManager) {
      try { soundManager.play('combo2'); } catch(e) {}
    }
    vibrate([20, 30, 20, 30, 20, 30, 60]);
  },

  gameOver() {
    if (!muted && soundManager) {
      try { soundManager.play('gameOver', { volume: 1.0 }); } catch(e) {}
    }
    vibrate([60, 50, 100, 50, 150]);
  },

  noSpace() {
    if (!muted && soundManager) {
      try { soundManager.play('noSpace', { volume: 1.0 }); } catch(e) {}
    }
    vibrate([60, 50, 100]);
  },

  highScore() {
    if (!muted && soundManager) {
      try { soundManager.play('highScore', { volume: 1.0 }); } catch(e) {}
    }
    vibrate([20, 30, 20, 30, 20, 30, 60]);
  },

  buttonClick() {
    if (!muted && soundManager) {
      try { soundManager.play('buttonClick', { volume: 1.0 }); } catch(e) {}
    }
  },

  newTurn() {
    // Disabled as requested
    vibrate(10);
  },

  uiClick() {
    if (!muted && soundManager) {
      try { soundManager.play('buttonClick', { volume: 1.0 }); } catch(e) {}
    }
    vibrate(12);
  },

  scorePop() {
    // Disabled as requested
  }
};
