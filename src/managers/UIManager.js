import Phaser from 'phaser';
import {
  GRID_SIZE, CELL_SIZE, GRID_PADDING, GRID_OFFSET_X, GRID_OFFSET_Y,
  GAME_WIDTH, GAME_HEIGHT, TIMING, SCORING
} from '../utils/Constants.js';
import { SoundManager } from '../audio/SoundManager.js';

export class UIManager {
  constructor(scene) {
    this.scene = scene;
    this._digitTexts = [];
    this._lastDisplayedScore = 0;
  }

  create(scoreManager) {
    this.scoreManager = scoreManager;
    this._createMainUI();
    this._createScoreUI();
  }

  _createMainUI() {
    const scene = this.scene;

    scene.add.text(16, 22, '👑', { fontSize: '24px' }).setOrigin(0, 0);

    this.highScoreText = scene.add.text(46, 24, `${this.scoreManager.getHighScore().toLocaleString()}`, {
      fontSize: '20px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFE66D'
    }).setOrigin(0, 0);

    const settingsCircle = scene.add.graphics().setDepth(100);
    settingsCircle.fillStyle(0x2a3565, 0.6);
    settingsCircle.fillCircle(GAME_WIDTH - 28, 36, 20);
    settingsCircle.lineStyle(1, 0x4488CC, 0.3);
    settingsCircle.strokeCircle(GAME_WIDTH - 28, 36, 20);

    this.pauseBtn = scene.add.text(GAME_WIDTH - 28, 36, '⚙', {
      fontSize: '22px'
    }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(0, 0, 22), hitAreaCallback: Phaser.Geom.Circle.Contains });
    this.pauseBtn.on('pointerdown', () => {
      SoundManager.uiClick();
      scene.tweens.add({
        targets: [this.pauseBtn, settingsCircle],
        scaleX: 0.85, scaleY: 0.85,
        duration: 60, yoyo: true, ease: 'Quad.easeIn'
      });
      scene.showPauseMenu();
    });

    this.scoreText = scene.add.text(GAME_WIDTH / 2, 48, '0', {
      fontSize: '48px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5, 0);

    this.comboText = scene.add.text(GAME_WIDTH / 2, GRID_OFFSET_Y + 180, '', {
      fontSize: '38px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#4488CC',
      stroke: '#FFD700', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    this.scorePopup = scene.add.text(GAME_WIDTH / 2, GRID_OFFSET_Y + 180, '', {
      fontSize: '28px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#4ECDC4',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    this.screenFlash = scene.add.image(0, 0, 'screen_flash').setOrigin(0).setDepth(50).setAlpha(0);
  }

  _createScoreUI() {
    const scene = this.scene;
    const bestScore = this.scoreManager.getHighScore();

    this.bestScoreLabel = scene.add.text(GAME_WIDTH / 2, 104, bestScore > 0 ? `BEST: ${bestScore.toLocaleString()}` : '', {
      fontSize: '14px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFD93D'
    }).setOrigin(0.5).setDepth(5).setAlpha(0.9);

    this.distanceText = scene.add.text(GAME_WIDTH / 2, 125, '', {
      fontSize: '11px', fontFamily: '"Fredoka", sans-serif', color: '#66DD88'
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    this.motivationText = scene.add.text(GAME_WIDTH / 2, GRID_OFFSET_Y - 22, '', {
      fontSize: '14px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFD700'
    }).setOrigin(0.5).setDepth(15).setAlpha(0);

    this.newHSBanner = scene.add.text(GAME_WIDTH / 2, 140, '🔥 NEW HIGH SCORE! 🔥', {
      fontSize: '16px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFD700',
      stroke: '#FF6600', strokeThickness: 3
    }).setOrigin(0.5).setDepth(20).setAlpha(0);
  }

  updateScoreDisplay(newHighScoreTriggered) {
    const scene = this.scene;
    const targetScore = this.scoreManager.getScore();
    const highScore = this.scoreManager.getHighScore();
    const currentScore = this._lastDisplayedScore;
    const diff = targetScore - currentScore;

    if (diff > 1000 || diff < 0) {
      this.scoreText.setText(targetScore.toLocaleString());
      this._lastDisplayedScore = targetScore;
    } else {
      this._rollDigits(currentScore, targetScore);
    }

    scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.25, scaleY: 1.25,
      duration: 120, yoyo: true, ease: 'Back.easeOut'
    });

    if (highScore > 0 && targetScore > highScore && !newHighScoreTriggered) {
      return true;
    }

    if (highScore > 0 && targetScore <= highScore) {
      const distance = highScore - targetScore;
      if (distance <= 50 && distance > 0) {
        this.showMotivation('New record within reach!');
      } else if (distance <= 100 && distance > 0) {
        this.showMotivation(`Only ${distance} to beat your best!`);
      }
      this.distanceText.setText(`${distance} to beat best`);
      this.distanceText.setAlpha(0.7);
    } else if (newHighScoreTriggered) {
      this.distanceText.setText(`+${targetScore - highScore} above best!`);
      this.distanceText.setColor('#FFD700');
      this.distanceText.setAlpha(0.9);
    }

    return false;
  }

  _rollDigits(fromScore, toScore) {
    const scene = this.scene;
    const fromStr = fromScore.toString();
    const toStr = toScore.toString();

    // Clean up old digit texts
    for (const dt of this._digitTexts) dt.destroy();
    this._digitTexts = [];

    const formatted = toScore.toLocaleString();
    const digitCount = formatted.length;
    const fontSize = 48;
    const charWidth = 26;
    const startX = GAME_WIDTH / 2 - (digitCount * charWidth) / 2;
    const baseY = 55;

    // Determine which digits changed (comparing from right)
    const maxLen = Math.max(fromStr.length, toStr.length);
    let firstChangedIdx = 0;
    for (let i = 0; i < maxLen; i++) {
      if (fromStr[fromStr.length - 1 - i] !== toStr[toStr.length - 1 - i]) {
        firstChangedIdx = maxLen - 1 - i;
      }
    }

    for (let i = 0; i < formatted.length; i++) {
      const ch = formatted[i];
      const x = startX + i * charWidth + charWidth / 2;
      const digit = scene.add.text(x, baseY, ch, {
        fontSize: `${fontSize}px`, fontFamily: '"Fredoka", sans-serif',
        fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5, 0).setDepth(6);

      this._digitTexts.push(digit);

      // Only animate digits that correspond to changed numeric positions
      const numericIdx = formatted.slice(0, i + 1).replace(/,/g, '').length - 1;
      if (ch !== ',' && numericIdx >= firstChangedIdx && fromScore !== 0) {
        const cascadeDelay = (formatted.length - 1 - i) * 30;
        digit.setY(baseY + 30).setAlpha(0);
        scene.tweens.add({
          targets: digit,
          y: baseY, alpha: 1,
          duration: 200, delay: cascadeDelay, ease: 'Back.easeOut'
        });
      }
    }

    // Hide the main scoreText since we're using individual digits
    this.scoreText.setAlpha(0);
    this._lastDisplayedScore = toScore;

    // After animation completes, consolidate back to single text
    scene.time.delayedCall(500, () => {
      for (const dt of this._digitTexts) dt.destroy();
      this._digitTexts = [];
      this.scoreText.setText(toScore.toLocaleString()).setAlpha(1);
    });
  }

  showMotivation(msg) {
    const scene = this.scene;
    this.motivationText.setText(msg);
    this.motivationText.setAlpha(0).setScale(0.8);
    scene.tweens.add({
      targets: this.motivationText,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 300, ease: 'Back.easeOut',
      onComplete: () => {
        scene.time.delayedCall(2000, () => {
          scene.tweens.add({ targets: this.motivationText, alpha: 0, duration: 400 });
        });
      }
    });
  }

  showComboText(combo) {
    const scene = this.scene;
    const messages = ['', '', 'Combo x2', 'Great!', 'Awesome!', 'Excellent!', 'Incredible!', 'Unstoppable!', 'LEGENDARY!'];
    const colors = ['#ffffff', '#ffffff', '#FFD700', '#FF8800', '#FF4444', '#FF00FF', '#00FFFF', '#00FF00', '#FFD700'];

    const msgIndex = Math.min(combo, messages.length - 1);
    const msg = messages[msgIndex] || `Combo x${combo}`;
    const color = colors[msgIndex] || '#FFD700';

    this.comboText.setText(msg);
    this.comboText.setColor(color);
    this.comboText.setAlpha(1).setScale(0);

    const targetScale = 1 + Math.min(combo * 0.1, 0.8);

    scene.tweens.chain({
      targets: this.comboText,
      tweens: [
        { scaleX: targetScale + 0.3, scaleY: targetScale + 0.3, duration: 200, ease: 'Back.easeOut' },
        { scaleX: targetScale, scaleY: targetScale, duration: 150 },
        { alpha: 0, scaleY: 0.3, duration: 250, ease: 'Power2', delay: TIMING.COMBO_TEXT_DURATION }
      ]
    });

    if (combo >= 4) {
      scene.cameras.main.shake(200, (combo * 2) / 1000);
    }
  }

  showScorePopup(points, clearedCells, combo) {
    const scene = this.scene;
    let cx = GAME_WIDTH / 2;
    let cy = GRID_OFFSET_Y + 200;
    if (clearedCells && clearedCells.length > 0) {
      let sumX = 0, sumY = 0;
      for (const cell of clearedCells) {
        sumX += GRID_OFFSET_X + cell.col * (CELL_SIZE + GRID_PADDING) + CELL_SIZE / 2;
        sumY += GRID_OFFSET_Y + cell.row * (CELL_SIZE + GRID_PADDING) + CELL_SIZE / 2;
      }
      cx = sumX / clearedCells.length;
      cy = sumY / clearedCells.length;
    }

    const label = combo > 1 ? `+${points} Combo ${combo}` : `+${points}`;
    this.scorePopup.setText(label);
    this.scorePopup.setPosition(cx, cy);
    this.scorePopup.setAlpha(1).setScale(0.3);

    scene.tweens.chain({
      targets: this.scorePopup,
      tweens: [
        { scaleX: 1.4, scaleY: 1.4, y: cy - 60, duration: TIMING.SCORE_POP_DURATION, ease: 'Back.easeOut' },
        { alpha: 0, y: cy - 90, scaleX: 0.8, scaleY: 0.8, duration: 400, ease: 'Power2' }
      ]
    });
  }

  triggerNewHighScore() {
    const scene = this.scene;
    SoundManager.levelComplete();

    this.newHSBanner.setAlpha(0).setScale(0.5);
    scene.tweens.chain({
      targets: this.newHSBanner,
      tweens: [
        { alpha: 1, scaleX: 1.2, scaleY: 1.2, duration: 400, ease: 'Back.easeOut' },
        { scaleX: 1, scaleY: 1, duration: 200 },
        { scaleX: 1.05, scaleY: 1.05, duration: 600, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' },
        { alpha: 0, duration: 500 }
      ]
    });

    this.bestScoreLabel.setText(`BEST: ${this.scoreManager.getScore().toLocaleString()}`);
    this.bestScoreLabel.setColor('#FFD700');
  }

  shutdown() {
    for (const dt of this._digitTexts) dt.destroy();
    this._digitTexts = [];
    this.scoreText = null;
    this.comboText = null;
    this.scorePopup = null;
    this.motivationText = null;
    this.bestScoreLabel = null;
    this.distanceText = null;
    this.newHSBanner = null;
    this.screenFlash = null;
  }
}
