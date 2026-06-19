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

    // Rich vibrant gradient background
    const bg = this.add.graphics();
    if (this.isNewHighScore) {
      bg.fillGradientStyle(0xFF1493, 0xFF1493, 0x8A2BE2, 0x8A2BE2, 1);
    } else {
      bg.fillGradientStyle(0x32ADE6, 0x32ADE6, 0x0072FF, 0x0072FF, 1);
    }
    bg.fillRect(0, 0, W, H);

    // Light vignette overlay
    this._createVignette(W, H);

    // Ambient floating particles
    this._createAmbientParticles(W, H);

    // Delayed card appearance and sound
    this.time.delayedCall(400, () => {
      if (this.isNewHighScore) {
        SoundManager.highScore();
        this._buildNewRecordScreen(W, H);
      } else {
        SoundManager.gameOver();
        this._buildGameOverScreen(W, H);
      }
    });
  }

  _createVignette(W, H) {
    const vignette = this.add.graphics().setDepth(1);
    vignette.fillStyle(0x000000, 0.15);
    vignette.fillRect(0, 0, W, 80);
    vignette.fillRect(0, H - 80, W, 80);
    vignette.fillRect(0, 0, 60, H);
    vignette.fillRect(W - 60, 0, 60, H);
  }

  _createAmbientParticles(W, H) {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(50, H - 50);
      const size = Phaser.Math.Between(4, 12);

      const dot = this.add.graphics();
      dot.fillStyle(0xFFFFFF, Phaser.Math.FloatBetween(0.1, 0.4));
      dot.fillCircle(0, 0, size);
      dot.setPosition(x, y).setDepth(1);

      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(50, 150),
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        onRepeat: () => {
          dot.setPosition(Phaser.Math.Between(20, W - 20), Phaser.Math.Between(H * 0.5, H));
          dot.setAlpha(Phaser.Math.FloatBetween(0.1, 0.4));
          dot.setScale(1);
        }
      });
    }
  }

  _buildNewRecordScreen(W, H) {
    // Gold particle fountain behind card
    this._createGoldFountain(W, H);

    // Pulsing crown icon
    const crown = this.add.text(W / 2, H * 0.12, '👑', {
      fontSize: '72px'
    }).setOrigin(0.5).setScale(0).setDepth(10);

    this.tweens.add({
      targets: crown, scaleX: 1, scaleY: 1,
      duration: 800, ease: 'Elastic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: crown, scaleX: 1.1, scaleY: 1.1,
          duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }
    });

    // "NEW RECORD" title with glow
    const titleShadow = this.add.text(W / 2, H * 0.22, 'NEW RECORD!', {
      fontSize: '42px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'heavy', color: '#FF8800',
      stroke: '#FF4400', strokeThickness: 10
    }).setOrigin(0.5).setAlpha(0.4).setDepth(9);

    const title = this.add.text(W / 2, H * 0.22, 'NEW RECORD!', {
      fontSize: '42px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'heavy', color: '#FFF500',
      stroke: '#CC5500', strokeThickness: 8
    }).setOrigin(0.5).setScale(0).setDepth(10);

    this.tweens.add({
      targets: title, scaleX: 1, scaleY: 1,
      duration: 800, delay: 100, ease: 'Elastic.easeOut'
    });

    this.tweens.add({
      targets: titleShadow,
      alpha: 0.6, y: H * 0.22 + 4, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this._buildScoreCard(W, H, 0.32);
    this._buildButtons(W, H, 0.68);
  }

  _buildGameOverScreen(W, H) {
    // Big chunky sad face or X
    const icon = this.add.text(W / 2, H * 0.12, '😔', {
      fontSize: '64px'
    }).setOrigin(0.5).setScale(0).setDepth(10);
    this.tweens.add({
      targets: icon, scaleX: 1, scaleY: 1,
      duration: 800, ease: 'Elastic.easeOut'
    });

    // "GAME OVER" title
    const title = this.add.text(W / 2, H * 0.22, 'GAME OVER', {
      fontSize: '42px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'heavy', color: '#FFFFFF',
      stroke: '#0055AA', strokeThickness: 8
    }).setOrigin(0.5).setScale(0).setDepth(10);

    this.tweens.add({
      targets: title, scaleX: 1, scaleY: 1,
      duration: 800, delay: 150, ease: 'Elastic.easeOut'
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
    const cardContainer = this.add.container(0, 150).setDepth(5).setAlpha(0);

    // Drop shadow
    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x000000, 0.3);
    cardShadow.fillRoundedRect(cardX - 6, cardY + 12, cardW + 12, cardH, 32);
    cardContainer.add(cardShadow);

    // Toy-box thick border (outer rim)
    const cardBorder = this.add.graphics();
    cardBorder.fillStyle(this.isNewHighScore ? 0xFFB300 : 0x33BBFF, 1); 
    cardBorder.fillRoundedRect(cardX - 8, cardY - 8, cardW + 16, cardH + 20, 32);
    cardContainer.add(cardBorder);

    // Main card interior (bright white)
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xFFFFFF, 1);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 24);
    cardContainer.add(cardBg);

    // Inner bright glow/rim
    const innerRim = this.add.graphics();
    innerRim.lineStyle(6, this.isNewHighScore ? 0xFFE566 : 0xAAEEFF, 0.8);
    innerRim.strokeRoundedRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 18);
    cardContainer.add(innerRim);

    // "SCORE" label
    const scoreLabel = this.add.text(W / 2, cardY + 30, 'SCORE', {
      fontSize: '14px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#888888'
    }).setOrigin(0.5);
    cardContainer.add(scoreLabel);

    // Score number (animated)
    const scoreNum = this.add.text(W / 2, cardY + 75, '0', {
      fontSize: '64px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'heavy', color: '#333333'
    }).setOrigin(0.5);
    cardContainer.add(scoreNum);

    // Divider
    const divider = this.add.graphics();
    divider.fillStyle(0xEEEEEE, 1);
    divider.fillRect(cardX + 40, cardY + 115, cardW - 80, 4);
    cardContainer.add(divider);

    // "BEST SCORE" label
    const bestLabel = this.add.text(W / 2, cardY + 140, 'BEST SCORE', {
      fontSize: '14px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#AAAAAA'
    }).setOrigin(0.5);
    cardContainer.add(bestLabel);

    // Best score value
    const bestDisplay = this.isNewHighScore ? this.finalScore : this.highScore;
    const bestColor = this.isNewHighScore ? '#FFB300' : '#FF2D55';
    const bestNum = this.add.text(W / 2, cardY + 175, bestDisplay.toLocaleString(), {
      fontSize: '36px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: bestColor
    }).setOrigin(0.5);
    cardContainer.add(bestNum);

    // Progress or personal best
    if (!this.isNewHighScore && this.highScore > 0) {
      const pct = Math.min(this.finalScore / this.highScore, 1);
      const barW = cardW - 60;
      const barX = cardX + 30;
      const barY = cardY + 205;

      const barBg = this.add.graphics();
      barBg.fillStyle(0xEEEEEE, 1);
      barBg.fillRoundedRect(barX, barY, barW, 14, 7);
      cardContainer.add(barBg);

      const barFill = this.add.graphics();
      const fillColor = pct > 0.8 ? 0x4CD964 : pct > 0.5 ? 0xFF9500 : 0x32ADE6;
      barFill.fillStyle(fillColor, 1);
      barFill.fillRoundedRect(barX, barY, barW * pct, 14, 7);
      cardContainer.add(barFill);

      const pctText = this.add.text(W / 2, barY + 22, `${Math.round(pct * 100)}% of best`, {
        fontSize: '12px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#999999'
      }).setOrigin(0.5);
      cardContainer.add(pctText);
    } else if (this.isNewHighScore) {
      const pbText = this.add.text(W / 2, cardY + 215, '⭐ Personal Best!', {
        fontSize: '18px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#FF9500'
      }).setOrigin(0.5);
      cardContainer.add(pbText);
    }

    // Slide-up animation
    this.tweens.add({
      targets: cardContainer,
      y: 0, alpha: 1,
      duration: 800, ease: 'Elastic.easeOut',
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

    const { container: playBtn } = ButtonFactory.create(this, W / 2, btnY, 220, 60, 'PLAY AGAIN', '▶', 'primary', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
        if (progress >= 1) this.scene.start('GameScene');
      });
    });
    playBtn.setScale(0);
    this.tweens.add({ targets: playBtn, scaleX: 1, scaleY: 1, duration: 800, delay: 200, ease: 'Elastic.easeOut' });

    const { container: homeBtn } = ButtonFactory.create(this, W / 2, btnY + 80, 220, 60, 'HOME', '🏠', 'secondary', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
        if (progress >= 1) this.scene.start('MenuScene');
      });
    });
    homeBtn.setScale(0);
    this.tweens.add({ targets: homeBtn, scaleX: 1, scaleY: 1, duration: 800, delay: 350, ease: 'Elastic.easeOut' });
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
