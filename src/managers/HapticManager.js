const PATTERNS = {
  dragStart: [10],
  place: [20, 30, 15],
  lineClear: [15, 40, 25],
  multiLineClear: [15, 30, 15, 30, 20, 50, 30],
  combo: [10, 20, 10, 20, 10, 40, 25],
  gameOver: [50, 100, 30, 80, 20, 60, 50],
  buttonTap: [8],
};

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export const HapticManager = {
  _enabled: true,

  setEnabled(enabled) {
    this._enabled = enabled;
  },

  _vibrate(pattern) {
    if (!this._enabled || !canVibrate()) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) { /* device doesn't support */ }
  },

  dragStart() {
    this._vibrate(PATTERNS.dragStart);
  },

  place() {
    this._vibrate(PATTERNS.place);
  },

  lineClear(lineCount) {
    if (lineCount >= 2) {
      this._vibrate(PATTERNS.multiLineClear);
    } else {
      this._vibrate(PATTERNS.lineClear);
    }
  },

  combo() {
    this._vibrate(PATTERNS.combo);
  },

  gameOver() {
    this._vibrate(PATTERNS.gameOver);
  },

  buttonTap() {
    this._vibrate(PATTERNS.buttonTap);
  },
};
