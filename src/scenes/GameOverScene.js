import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';
import { ButtonFactory } from '../ui/ButtonFactory.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.highScore = data.highScore || 0;
    this.isNewHighScore = data.isNewHighScore || false;
  }

  create() {
    this.events.once('shutdown', () => this.shutdown());
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    // Rich gradient background
    const bg = this.add.graphics();
    if (this.isNewHighScore) {
      bg.fillGradientStyle(0x1A0A3E, 0x1A0A3E, 0x0A0418, 0x0A0418, 1);
    } else {
      bg.fillGradientStyle(0x0F1B3E, 0x0F1B3E, 0x060D1E, 0x060D1E, 1);
    }
    bg.fillRect(0, 0, W, H);

    // Dark vignette overlay
    this._createVignette(W, H);

    // Shockwave ring expanding from center
    this._createShockwave(W, H);

    // Ambient floating particles
    this._createAmbientParticles(W, H);

    // Delayed card appearance
    this.time.delayedCall(600, () => {
      if (this.isNewHighScore) {
        this._buildNewRecordScreen(W, H);
      } else {
        this._buildGameOverScreen(W, H);
      }
    });
  }

  _createVignette(W, H) {
    const vignette = this.add.graphics().setDepth(1);
    vignette.fillStyle(0x000000, 0.4);
    vignette.fillRect(0, 0, W, 80);
    vignette.fillRect(0, H - 80, W, 80);
    vignette.fillRect(0, 0, 60, H);
    vignette.fillRect(W - 60, 0, 60, H);

    this.tweens.add({
      targets: vignette, alpha: 0.7,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }

  _createShockwave(W, H) {
    const ring = this.add.graphics().setDepth(2);
    ring.lineStyle(4, 0xFFFFFF, 0.8);
    ring.strokeCircle(0, 0, 20);
    ring.setPosition(W / 2, H * 0.35);
    ring.setScale(0.5);

    this.tweens.add({
      targets: ring, scaleX: 12, scaleY: 12, alpha: 0,
      duration: 800, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  _createAmbientParticles(W, H) {
    const colors = this.isNewHighScore
      ? [0xFFD700, 0xFFA500, 0xFFEE88, 0xFF6600]
      : [0x4488FF, 0x6644FF, 0x44CCFF, 0x8866FF];

    for (let i = 0; i < 25; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(50, H - 50);
      const size = Phaser.Math.Between(2, 5);
      const color = colors[i % colors.length];

      const dot = this.add.graphics();
      dot.fillStyle(color, Phaser.Math.FloatBetween(0.2, 0.5));
      dot.fillCircle(0, 0, size);
      dot.setPosition(x, y).setDepth(1);

      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(30, 100),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        onRepeat: () => {
          dot.setPosition(Phaser.Math.Between(20, W - 20), Phaser.Math.Between(H * 0.5, H));
          dot.setAlpha(Phaser.Math.FloatBetween(0.2, 0.5));
        }
      });
    }
  }

  _buildNewRecordScreen(W, H) {
    // Gold particle fountain behind card
    this._createGoldFountain(W, H);

    // Pulsing crown icon
    const crown = this.add.text(W / 2, H * 0.12, '👑', {
      fontSize: '64px'
    }).setOrigin(0.5).setScale(0).setDepth(10);

    this.tweens.add({
      targets: crown, scaleX: 1, scaleY: 1,
      duration: 600, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: crown, scaleX: 1.1, scaleY: 1.1,
          duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }
    });

    // "NEW RECORD" title with glow
    const titleShadow = this.add.text(W / 2, H * 0.21, 'NEW RECORD!', {
      fontSize: '36px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FF8800',
      stroke: '#FF4400', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0.4).setDepth(9);

    const title = this.add.text(W / 2, H * 0.21, 'NEW RECORD!', {
      fontSize: '36px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFD700',
      stroke: '#CC8800', strokeThickness: 4
    }).setOrigin(0.5).setScale(0).setDepth(10);

    this.tweens.add({
      targets: title, scaleX: 1, scaleY: 1,
      duration: 500, delay: 100, ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: titleShadow,
      alpha: 0.6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this._buildScoreCard(W, H, 0.32);
    this._buildButtons(W, H, 0.68);

    this.time.delayedCall(300, () => SoundManager.levelComplete());
  }

  _buildGameOverScreen(W, H) {
    // Geometric X icon
    const iconG = this.add.graphics().setDepth(10);
    const cx = W / 2, cy = H * 0.12;
    iconG.fillStyle(0xFF4455, 0.15);
    iconG.fillCircle(cx, cy, 30);
    iconG.lineStyle(3, 0xFF4455, 0.6);
    iconG.strokeCircle(cx, cy, 30);
    iconG.lineStyle(4, 0xFF6677, 1);
    iconG.lineBetween(cx - 12, cy - 12, cx + 12, cy + 12);
    iconG.lineBetween(cx + 12, cy - 12, cx - 12, cy + 12);
    iconG.setScale(0);
    this.tweens.add({
      targets: iconG, scaleX: 1, scaleY: 1,
      duration: 500, ease: 'Back.easeOut'
    });

    // "GAME OVER" title
    const title = this.add.text(W / 2, H * 0.2, 'GAME OVER', {
      fontSize: '38px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFFFFF',
      stroke: '#333366', strokeThickness: 4
    }).setOrigin(0.5).setScale(0).setDepth(10);

    this.tweens.add({
      targets: title, scaleX: 1, scaleY: 1,
      duration: 500, delay: 200, ease: 'Back.easeOut'
    });

    this._buildScoreCard(W, H, 0.3);
    this._buildButtons(W, H, 0.68);
  }

  _createGoldFountain(W, H) {
    for (let i = 0; i < 30; i++) {
      const dot = this.add.graphics().setDepth(3);
      dot.fillStyle(0xFFD700, Phaser.Math.FloatBetween(0.4, 0.9));
      dot.fillCircle(0, 0, Phaser.Math.Between(2, 6));
      dot.setPosition(W / 2 + Phaser.Math.Between(-80, 80), H * 0.55);

      this.tweens.add({
        targets: dot,
        y: H * 0.1 + Phaser.Math.Between(0, 100),
        x: dot.x + Phaser.Math.Between(-60, 60),
        alpha: 0,
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 800),
        repeat: -1,
        onRepeat: () => {
          dot.setPosition(W / 2 + Phaser.Math.Between(-80, 80), H * 0.55);
          dot.setAlpha(Phaser.Math.FloatBetween(0.4, 0.9));
        }
      });
    }
  }

  _buildScoreCard(W, H, startY) {
    const cardW = 300, cardH = 240;
    const cardX = (W - cardW) / 2;
    const cardY = H * startY + H * 0.1;

    // Card slides up from below
    const cardContainer = this.add.container(0, 100).setDepth(5).setAlpha(0);

    // Glassmorphism card
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1a2255, 0.7);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 20);
    cardBg.lineStyle(1.5, 0x4466AA, 0.5);
    cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 20);
    cardContainer.add(cardBg);

    // Inner glow
    const glowLine = this.add.graphics();
    glowLine.fillStyle(0x5588FF, 0.2);
    glowLine.fillRoundedRect(cardX + 10, cardY + 5, cardW - 20, 3, 2);
    cardContainer.add(glowLine);

    // "SCORE" label
    const scoreLabel = this.add.text(W / 2, cardY + 30, 'SCORE', {
      fontSize: '12px', fontFamily: '"Fredoka", sans-serif', fontStyle: 'bold', color: '#7799CC'
    }).setOrigin(0.5);
    cardContainer.add(scoreLabel);

    // Score number (animated)
    const scoreNum = this.add.text(W / 2, cardY + 75, '0', {
      fontSize: '52px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5);
    cardContainer.add(scoreNum);

    // Divider
    const divider = this.add.graphics();
    divider.fillStyle(0x4466AA, 0.3);
    divider.fillRect(cardX + 40, cardY + 115, cardW - 80, 1);
    cardContainer.add(divider);

    // "BEST SCORE" label
    const bestLabel = this.add.text(W / 2, cardY + 135, 'BEST SCORE', {
      fontSize: '11px', fontFamily: '"Fredoka", sans-serif', fontStyle: 'bold', color: '#CCAA44'
    }).setOrigin(0.5);
    cardContainer.add(bestLabel);

    // Best score value
    const bestDisplay = this.isNewHighScore ? this.finalScore : this.highScore;
    const bestColor = this.isNewHighScore ? '#FFD700' : '#FFCC55';
    const bestNum = this.add.text(W / 2, cardY + 168, bestDisplay.toLocaleString(), {
      fontSize: '32px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: bestColor
    }).setOrigin(0.5);
    cardContainer.add(bestNum);

    // Progress or personal best
    if (!this.isNewHighScore && this.highScore > 0) {
      const pct = Math.min(this.finalScore / this.highScore, 1);
      const barW = cardW - 60;
      const barX = cardX + 30;
      const barY = cardY + 200;

      const barBg = this.add.graphics();
      barBg.fillStyle(0x222255, 1);
      barBg.fillRoundedRect(barX, barY, barW, 10, 5);
      cardContainer.add(barBg);

      const barFill = this.add.graphics();
      const fillColor = pct > 0.8 ? 0x44DD66 : pct > 0.5 ? 0xFFCC00 : 0x4488FF;
      barFill.fillStyle(fillColor, 1);
      barFill.fillRoundedRect(barX, barY, barW * pct, 10, 5);
      cardContainer.add(barFill);

      const pctText = this.add.text(W / 2, barY + 20, `${Math.round(pct * 100)}% of best`, {
        fontSize: '10px', fontFamily: '"Fredoka", sans-serif', color: '#8899BB'
      }).setOrigin(0.5);
      cardContainer.add(pctText);
    } else if (this.isNewHighScore) {
      const pbText = this.add.text(W / 2, cardY + 208, '⭐ Personal Best!', {
        fontSize: '13px', fontFamily: '"Fredoka", sans-serif', fontStyle: 'bold', color: '#FFD700'
      }).setOrigin(0.5);
      cardContainer.add(pbText);
    }

    // Slide-up animation
    this.tweens.add({
      targets: cardContainer,
      y: 0, alpha: 1,
      duration: 600, ease: 'Back.easeOut',
      onComplete: () => {
        // Animate score counter with camera shake on milestones
        this._animateScoreCounter(scoreNum);
      }
    });
  }

  _animateScoreCounter(scoreNum) {
    let lastMilestone = 0;
    this.tweens.addCounter({
      from: 0, to: this.finalScore,
      duration: Math.min(1200, 400 + this.finalScore * 2),
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const val = Math.round(tween.getValue());
        scoreNum.setText(val.toLocaleString());

        // Camera shake on milestones
        const milestones = [100, 500, 1000, 2000, 5000];
        for (const m of milestones) {
          if (val >= m && lastMilestone < m) {
            lastMilestone = m;
            this.cameras.main.shake(100, 0.003);
          }
        }
      }
    });
  }

  _buildButtons(W, H, startY) {
    const btnY = H * startY + H * 0.12;

    const { container: playBtn } = ButtonFactory.create(this, W / 2, btnY, 220, 54, 'PLAY AGAIN', '▶', 'primary', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
        if (progress >= 1) this.scene.start('GameScene');
      });
    });
    playBtn.setScale(0);
    this.tweens.add({ targets: playBtn, scaleX: 1, scaleY: 1, duration: 400, delay: 200, ease: 'Back.easeOut' });

    const { container: homeBtn } = ButtonFactory.create(this, W / 2, btnY + 70, 220, 54, 'HOME', '🏠', 'secondary', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
        if (progress >= 1) this.scene.start('MenuScene');
      });
    });
    homeBtn.setScale(0);
    this.tweens.add({ targets: homeBtn, scaleX: 1, scaleY: 1, duration: 400, delay: 350, ease: 'Back.easeOut' });
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
