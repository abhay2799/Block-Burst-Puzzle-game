import Phaser from 'phaser';
import {
  GRID_SIZE, CELL_SIZE, GRID_PADDING, GRID_OFFSET_X, GRID_OFFSET_Y,
  GAME_WIDTH, GAME_HEIGHT, TIMING, SCORING
} from '../utils/Constants.js';
import { SoundManager } from '../audio/SoundManager.js';
import { ButtonFactory } from '../ui/ButtonFactory.js';

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

    // Glossy 3D Blue Settings Button
    const pauseBtn = scene.add.container(GAME_WIDTH - 35, 42).setDepth(20);
    
    // Inner container for visuals (to prevent hover jitter)
    const pauseVisuals = scene.add.container(0, 0);
    pauseBtn.add(pauseVisuals);

    const pauseBg = scene.add.graphics();
    const r = 24;

    // Drop shadow
    pauseBg.fillStyle(0x000000, 0.3);
    pauseBg.fillCircle(0, 4, r + 1);

    // Outer dark rim (bottom shadow of the torus)
    pauseBg.fillStyle(0x004C99, 1);
    pauseBg.fillCircle(0, 1, r);

    // Outer bright rim (top highlight of the torus)
    pauseBg.fillStyle(0x00A3FF, 1);
    pauseBg.fillCircle(0, -1, r);

    // Mid-tone torus body
    pauseBg.fillStyle(0x007BFF, 1);
    pauseBg.fillCircle(0, 0, r - 1.5);

    // Inner dark rim (shadow cast by torus into the center)
    pauseBg.fillStyle(0x003380, 1);
    pauseBg.fillCircle(0, 0, r - 6);

    // Inner sunken face (lighter blue)
    pauseBg.fillStyle(0x0088FF, 1);
    pauseBg.fillCircle(0, 1, r - 7);
    
    pauseVisuals.add(pauseBg);

    // Gear Icon Drop Shadow
    const iconShadow = scene.add.text(0, 3, '⚙', {
      fontSize: '32px', color: '#002266'
    }).setOrigin(0.5, 0.5);
    pauseVisuals.add(iconShadow);

    // Metallic white gear
    const pauseIcon = scene.add.text(0, 0, '⚙', {
      fontSize: '32px', color: '#FFFFFF',
      stroke: '#E0EEFF', strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#ffffff', blur: 4, fill: true }
    }).setOrigin(0.5, 0.5);
    pauseVisuals.add(pauseIcon);

    // Static interactive zone (larger than visual button for easier tapping)
    const hitZone = scene.add.zone(0, 0, r * 2 + 20, r * 2 + 20).setInteractive({ useHandCursor: true });
    pauseBtn.add(hitZone);
    
    hitZone.on('pointerover', () => {
      scene.tweens.killTweensOf(pauseVisuals);
      scene.tweens.add({ targets: pauseVisuals, scaleX: 1.1, scaleY: 1.1, duration: 200, ease: 'Back.easeOut' });
    });
    hitZone.on('pointerout', () => {
      scene.tweens.killTweensOf(pauseVisuals);
      scene.tweens.add({ targets: pauseVisuals, scaleX: 1, scaleY: 1, duration: 200, ease: 'Power2' });
    });
    hitZone.on('pointerdown', () => {
      SoundManager.uiClick();
      scene.tweens.killTweensOf(pauseVisuals);
      scene.tweens.add({ targets: pauseVisuals, scaleX: 0.9, scaleY: 0.9, duration: 100, yoyo: true });
      scene.time.delayedCall(150, () => scene.showPauseMenu());
    });
    this.pauseBtn = pauseBtn;

    // Level Badge
    const roundW = 110;
    const roundX = GAME_WIDTH / 2 - roundW / 2;
    const roundY = 16;
    const roundH = 40;
    const roundR = 20;

    const lvlBg = scene.add.graphics().setDepth(19);
    lvlBg.fillStyle(0x050A1A, 0.5);
    lvlBg.fillRoundedRect(roundX, roundY, roundW, roundH, roundR);
    lvlBg.lineStyle(2, 0x44AAFF, 0.6);
    lvlBg.strokeRoundedRect(roundX, roundY, roundW, roundH, roundR);

    this.levelText = scene.add.text(GAME_WIDTH / 2, roundY + roundH / 2, 'Round 1', {
      fontSize: '20px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#FFFFFF',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 3, fill: true, alpha: 0.6 }
    }).setOrigin(0.5).setDepth(20);

    // Massive Score Text
    this.scoreText = scene.add.text(GAME_WIDTH / 2, 70, '0', {
      fontSize: '64px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 4, color: '#002266', blur: 0, fill: true }
    }).setOrigin(0.5, 0);

    this.comboText = scene.add.text(GAME_WIDTH / 2, GRID_OFFSET_Y + 180, '', {
      fontSize: '38px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#4488CC',
      stroke: '#FFD700', strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    this.scorePopup = scene.add.text(GAME_WIDTH / 2, GRID_OFFSET_Y + 180, '', {
      fontSize: '28px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#4ECDC4',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0).setDepth(20);
    
    this.screenFlash = scene.add.image(0, 0, 'screen_flash').setOrigin(0).setDepth(50).setAlpha(0);
  }

  _createScoreUI() {
    const scene = this.scene;
    const bestScore = this.scoreManager.getHighScore();

    const pillX = 25;
    const pillY = 20;
    const pillW = 125;
    const pillH = 44;
    const pillR = 22;

    this.bestBg = scene.add.container(0, 0).setDepth(4);
    
    // Bottom highlight for depth (light blue)
    const highlight = scene.add.graphics();
    highlight.fillStyle(0x4466AA, 0.4);
    highlight.fillRoundedRect(pillX, pillY + 2, pillW, pillH, pillR);
    this.bestBg.add(highlight);

    // Main sunken background (very dark blue)
    const mainBg = scene.add.graphics();
    mainBg.fillStyle(0x182444, 1);
    mainBg.fillRoundedRect(pillX, pillY, pillW, pillH, pillR);
    this.bestBg.add(mainBg);

    // Inner top shadow
    const innerShadow = scene.add.graphics();
    innerShadow.lineStyle(3, 0x0A1229, 0.6);
    innerShadow.strokeRoundedRect(pillX, pillY, pillW, pillH, pillR);
    this.bestBg.add(innerShadow);

    // Trophy Icon overlapping the left edge
    this.trophyIcon = scene.add.text(pillX + 5, pillY + pillH / 2, '🏆', {
      fontSize: '40px',
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 4, fill: true, alpha: 0.4 }
    }).setOrigin(0.5, 0.5);
    this.bestBg.add(this.trophyIcon);

    // Golden Score Label
    this.bestScoreLabel = scene.add.text(pillX + 45, pillY + pillH / 2 + 2, bestScore > 0 ? bestScore.toLocaleString() : '', {
      fontSize: '26px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#FFB300',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 0, fill: true, alpha: 0.3 }
    }).setOrigin(0, 0.5);
    this.bestBg.add(this.bestScoreLabel);
    
    if (bestScore === 0) this.bestBg.setAlpha(0);

    this.distanceText = scene.add.text(GAME_WIDTH / 2, 155, '', {
      fontSize: '22px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', 
      fontStyle: 'bold', color: '#FFD700',
      stroke: '#002266', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 2, color: '#001133', blur: 4, fill: true, alpha: 0.6 }
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    this.motivationText = scene.add.text(GAME_WIDTH / 2, GRID_OFFSET_Y - 22, '', {
      fontSize: '16px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#FFD700'
    }).setOrigin(0.5).setDepth(15).setAlpha(0);

    this.newHSBanner = scene.add.text(GAME_WIDTH / 2, 155, '🔥 NEW HIGH SCORE! 🔥', {
      fontSize: '18px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
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

    if (this.levelText && this.scoreManager.getLevel) {
      const isBossLevel = this.scoreManager.getLevel() % 3 === 0;
      this.levelText.setText(`Round ${this.scoreManager.getLevel()}`);
      this.levelText.setColor(isBossLevel ? '#FF4444' : '#FFD700');
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
    const fontSize = 64;
    const charWidth = 34;
    const startX = GAME_WIDTH / 2 - (digitCount * charWidth) / 2;
    const baseY = 70;

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
        fontSize: `${fontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
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

  showWinningStreak() {
    const scene = this.scene;
    SoundManager.levelComplete();
    
    this.motivationText.setText("🏆 WINNING STREAK! 🏆\nNext level is TOUGH!");
    this.motivationText.setColor('#FFD700');
    this.motivationText.setAlpha(0).setScale(0.5);
    scene.tweens.chain({
      targets: this.motivationText,
      tweens: [
        { alpha: 1, scaleX: 1.2, scaleY: 1.2, duration: 400, ease: 'Back.easeOut' },
        { scaleX: 1, scaleY: 1, duration: 200 },
        { scaleX: 1.05, scaleY: 1.05, duration: 600, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' },
        { alpha: 0, duration: 500 }
      ]
    });
  }

  showComboText(combo, placedCells, glowColor) {
    const scene = this.scene;
    const words = ["", "", "Good!", "Great!", "Amazing!", "Excellent!", "Wonderful!", "Master!", "Pro!", "Genius!"];
    const wordIndex = Math.min(combo, words.length - 1);
    const msg = words[wordIndex];
    
    if (!msg) return;

    // Determine hex strings for the bright color and a darker stroke color
    const hexColor = '#' + glowColor.toString(16).padStart(6, '0');
    const darkerColor = Phaser.Display.Color.IntegerToColor(glowColor).darken(40).color;
    const darkHex = '#' + darkerColor.toString(16).padStart(6, '0');

    if (combo >= 2 && words[wordIndex]) {
      SoundManager.speak(words[wordIndex].replace('!', ''));
    }

    this.comboText.setText(msg);
    this.comboText.setColor(hexColor);
    this.comboText.setStroke(darkHex, 8);
    // Remove shadow, keep it flat 3D looking like the reference image
    this.comboText.setShadow(0, 0, '#000000', 0, false, false);
    
    // Position near the placed piece
    let cx = GAME_WIDTH / 2;
    let cy = GRID_OFFSET_Y + 160;
    if (placedCells && placedCells.length > 0) {
      let sumX = 0, sumY = 0;
      placedCells.forEach(p => {
        sumX += GRID_OFFSET_X + p.col * (CELL_SIZE + GRID_PADDING) + CELL_SIZE/2;
        sumY += GRID_OFFSET_Y + p.row * (CELL_SIZE + GRID_PADDING) + CELL_SIZE/2;
      });
      cx = sumX / placedCells.length;
      cy = sumY / placedCells.length;
    }

    const startX = Math.min(cx + 50, GAME_WIDTH - 60);
    const startY = cy;

    this.comboText.setPosition(startX, startY);
    this.comboText.setAlpha(1).setScale(0);
    this.comboText.setAngle(Phaser.Math.Between(-5, 5));

    const targetScale = 1 + Math.min(combo * 0.1, 0.6);

    scene.tweens.chain({
      targets: this.comboText,
      tweens: [
        { 
          scaleX: targetScale + 0.3, scaleY: targetScale + 0.3, 
          duration: 300, ease: 'Back.easeOut' 
        },
        { 
          scaleX: targetScale, scaleY: targetScale, 
          duration: 200 
        },
        { 
          y: startY - 50, // Float upwards slightly
          alpha: 0, 
          duration: 400, 
          ease: 'Power2', 
          delay: TIMING.COMBO_TEXT_DURATION || 600 
        }
      ]
    });

    // if (combo >= 3 && SoundManager.isHapticsEnabled()) {
    //   scene.cameras.main.shake(120, (combo * 1.5) / 1000);
    // }
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

    this.bestBg.setAlpha(1);
    this.bestScoreLabel.setText(this.scoreManager.getScore().toLocaleString());
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
