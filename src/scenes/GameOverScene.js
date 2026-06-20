import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';
import { ButtonFactory } from '../ui/ButtonFactory.js';
import { AdManager } from '../ads/AdManager.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.finalScore = data?.score || 0;
    this.highScore = data?.highScore || 0;
    this.isNewHighScore = data?.isNewHighScore || false;
    this.linesCleared = data?.linesCleared || 0;
    this.blocksPlaced = data?.blocksPlaced || 0;
    this.highestCombo = data?.highestCombo || 0;
    this.gameOverData = data || null;
    this.hasRevived = data?.hasRevived || false;
  }

  create() {
    this.events.once('shutdown', () => this.shutdown());
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    // Dark vibrant background (#0B1021)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x161F3D, 0x161F3D, 0x0B1021, 0x0B1021, 1);
    bg.fillRect(0, 0, W, H);

    this._createAmbientParticles(W, H);

    // Show Interstitial Ad unconditionally every time the game ends
    AdManager.showInterstitial(this, () => {
      // Build the UI and play animations only after the ad is dismissed (or immediately if skipped)
      this.time.delayedCall(200, () => {
        if (this.isNewHighScore) {
          SoundManager.highScore();
        } else {
          SoundManager.gameOver();
        }
        this._buildGameOverScreen(W, H);
      });
    });
  }

  _createAmbientParticles(W, H) {
    // Floating confetti/blocks
    const colors = [0xFF3366, 0x33CCFF, 0x66FF66, 0xFFCC00, 0x9933FF];
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const size = Phaser.Math.Between(6, 14);
      const color = colors[Math.floor(Math.random() * colors.length)];

      const dot = this.add.graphics();
      dot.fillStyle(color, Phaser.Math.FloatBetween(0.6, 1));
      
      if (Math.random() > 0.5) {
        dot.fillRoundedRect(-size/2, -size/2, size, size, 2);
      } else {
        dot.fillRoundedRect(-size, -size/2, size*2, size, 2);
      }
      dot.setPosition(x, y).setDepth(1);
      dot.setAngle(Phaser.Math.Between(0, 360));

      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(100, 400),
        x: x + Phaser.Math.Between(-80, 80),
        angle: dot.angle + Phaser.Math.Between(90, 360),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.setPosition(Phaser.Math.Between(0, W), H + 20);
          dot.setAlpha(Phaser.Math.FloatBetween(0.6, 1));
        }
      });
    }
  }

  _buildGameOverScreen(W, H) {
    // Sad block character
    this._createMascot(W * 0.22, H * 0.22);

    // "GAME OVER" 3D Title
    this._createGameOverTitle(W, H * 0.12);

    const sub1Text = this.isNewHighScore ? 'Amazing Performance!' : 'No more space left!';
    const sub2Text = this.isNewHighScore ? 'You set a new record!' : 'Better luck next time!';

    const sub1 = this.add.text(W / 2, H * 0.28, sub1Text, {
      fontSize: '22px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const sub2 = this.add.text(W / 2, H * 0.31, sub2Text, {
      fontSize: '16px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#8899CC'
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.tweens.add({ targets: [sub1, sub2], alpha: 1, duration: 600, delay: 300 });

    this._buildScoreCard(W, H, 0.34);
    if (!this.hasRevived) {
      this._buildContinueCard(W, H, 0.57);
      this._buildButtons(W, H, 0.69);
      this._buildKeepImproving(W, H, 0.79);
    } else {
      this._buildButtons(W, H, 0.55);
      this._buildKeepImproving(W, H, 0.68);
    }
  }

  _createMascot(xPos, yPos) {
    const container = this.add.container(xPos, yPos).setDepth(9).setScale(0);
    
    // Body
    const body = this.add.graphics();
    body.fillStyle(0x0066FF, 1);
    body.fillRoundedRect(-30, -30, 60, 60, 12);
    body.lineStyle(4, 0x0044CC, 1);
    body.strokeRoundedRect(-30, -30, 60, 60, 12);
    container.add(body);

    // Eyes
    const eye1 = this.add.text(-12, -10, 'x', { fontSize: '20px', color: '#002266', fontStyle: 'bold' }).setOrigin(0.5);
    const eye2 = this.add.text(12, -10, 'x', { fontSize: '20px', color: '#002266', fontStyle: 'bold' }).setOrigin(0.5);
    container.add(eye1);
    container.add(eye2);

    // Mouth
    const mouth = this.add.graphics();
    mouth.lineStyle(3, 0x002266, 1);
    mouth.beginPath();
    mouth.arc(0, 15, 8, Math.PI, 0, false);
    mouth.strokePath();
    container.add(mouth);

    // Float animation
    this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, angle: -10, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: container, y: yPos - 10, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  _createGameOverTitle(W, yPos) {
    const container = this.add.container(W / 2 + 5, yPos).setDepth(10).setScale(0);

    const textStyle = {
      fontSize: '70px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', align: 'center', lineSpacing: -5
    };

    const titleText = this.isNewHighScore ? 'NEW\nBEST!' : 'GAME\nOVER';
    const shadowColor = this.isNewHighScore ? '#996600' : '#660000';
    const extrudeColor = this.isNewHighScore ? '#FFB300' : '#D91A2A';

    // Dark base for depth shadow
    const shadowLayer = this.add.text(0, 12, titleText, { ...textStyle, color: shadowColor }).setOrigin(0.5);
    container.add(shadowLayer);

    // Thick 3D extrusion loop
    for(let i = 10; i >= 1; i--) {
      const depthLayer = this.add.text(0, i, titleText, { ...textStyle, color: extrudeColor }).setOrigin(0.5);
      container.add(depthLayer);
    }

    // White top face
    const titleFace = this.add.text(0, 0, titleText, {
      ...textStyle, color: '#FFFFFF'
    }).setOrigin(0.5);
    container.add(titleFace);

    this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 800, ease: 'Elastic.easeOut' });
  }

  _buildScoreCard(W, H, startY) {
    const cardW = 320, cardH = 170;
    const cardX = W / 2;
    const cardY = H * startY + cardH / 2;

    const cardContainer = this.add.container(cardX, cardY + 50).setDepth(5).setAlpha(0);

    // Dark inner card
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x132247, 1);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    // Light blue thin rim
    cardBg.lineStyle(2, 0x335588, 1);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    cardContainer.add(cardBg);

    // "SCORE"
    const scoreLabel = this.add.text(0, -cardH / 2 + 25, 'SCORE', {
      fontSize: '18px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#6688CC'
    }).setOrigin(0.5);
    cardContainer.add(scoreLabel);

    // Score Num
    const scoreNum = this.add.text(0, -cardH / 2 + 75, '0', {
      fontSize: '64px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5);
    cardContainer.add(scoreNum);

    // Dashed divider
    const divider = this.add.graphics();
    divider.lineStyle(2, 0x335588, 1);
    divider.beginPath();
    for (let i = -cardW/2 + 30; i < cardW/2 - 30; i += 12) {
      divider.moveTo(i, 20);
      divider.lineTo(i + 6, 20);
    }
    divider.strokePath();
    cardContainer.add(divider);

    // "BEST SCORE 👑"
    const bestLabel = this.add.text(0, 42, 'BEST SCORE 👑', {
      fontSize: '16px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#FFD700'
    }).setOrigin(0.5);
    cardContainer.add(bestLabel);

    // Best Num
    const bestVal = this.isNewHighScore ? this.finalScore : this.highScore;
    const bestNum = this.add.text(0, 72, bestVal.toLocaleString(), {
      fontSize: '32px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#FFD700'
    }).setOrigin(0.5);
    cardContainer.add(bestNum);

    this.tweens.add({
      targets: cardContainer, y: cardY, alpha: 1, duration: 800, delay: 100, ease: 'Back.easeOut',
      onComplete: () => this._animateScoreCounter(scoreNum)
    });
  }

  _animateScoreCounter(scoreNum) {
    this.tweens.addCounter({
      from: 0, to: this.finalScore,
      duration: Math.min(1200, 400 + this.finalScore * 2),
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        scoreNum.setText(Math.round(tween.getValue()).toLocaleString());
      }
    });
  }

  _buildContinueCard(W, H, startY) {
    const cardW = 340, cardH = 80;
    const cardX = W / 2;
    const cardY = H * startY + cardH / 2;

    const cardContainer = this.add.container(cardX, cardY + 30).setDepth(5).setAlpha(0);

    // Outline glow
    const glow = this.add.graphics();
    glow.lineStyle(3, 0xFFCC00, 0.6);
    glow.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    cardContainer.add(glow);

    // Background
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0F1838, 1);
    cardBg.fillRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, cardH - 4, 18);
    cardContainer.add(cardBg);

    // Heart Icon (+1)
    const heartBg = this.add.graphics();
    heartBg.fillStyle(0xDD2222, 1);
    heartBg.fillCircle(-cardW / 2 + 45, 0, 26);
    heartBg.lineStyle(2, 0xFFCC00, 1);
    heartBg.strokeCircle(-cardW / 2 + 45, 0, 26);
    cardContainer.add(heartBg);
    
    const heartText = this.add.text(-cardW / 2 + 45, 0, '+1', {
      fontSize: '22px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5);
    cardContainer.add(heartText);

    // Texts
    const title = this.add.text(-cardW / 2 + 85, -12, 'CONTINUE?', {
      fontSize: '16px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#FFCC00'
    }).setOrigin(0, 0.5);
    cardContainer.add(title);

    const sub = this.add.text(-cardW / 2 + 85, 10, 'Watch an ad to continue\nand keep playing!', {
      fontSize: '11px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#AAAAAA', lineSpacing: -2
    }).setOrigin(0, 0.5);
    cardContainer.add(sub);

    // Watch Button
    const { container: watchBtn } = ButtonFactory.create(this, cardW / 2 - 60, 0, 100, 40, 'WATCH', '▶', 'primary', () => {
      AdManager.showRewardVideoAd(this, (rewardGranted) => {
        if (rewardGranted) {
          if (this.gameOverData) {
            this.gameOverData.hasRevived = true;
          }
          this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
            if (progress >= 1) this.scene.start('GameScene', { reviveData: this.gameOverData });
          });
        } else {
          // User closed the video early or it failed, no reward.
        }
      });
    });
    cardContainer.add(watchBtn);

    this.tweens.add({ targets: cardContainer, y: cardY, alpha: 1, duration: 800, delay: 200, ease: 'Back.easeOut' });
  }

  _buildButtons(W, H, startY) {
    const btnY = H * startY + 25;
    const spacing = 160;

    const { container: homeBtn } = ButtonFactory.create(this, W / 2 - spacing / 2, btnY, 145, 50, 'HOME', '🏠', 'secondary', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
        if (progress >= 1) this.scene.start('MenuScene');
      });
    });
    homeBtn.setScale(0);

    const { container: retryBtn } = ButtonFactory.create(this, W / 2 + spacing / 2, btnY, 145, 50, 'RETRY', '🔄', 'warning', () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
        if (progress >= 1) this.scene.start('GameScene', {});
      });
    });
    retryBtn.setScale(0);

    this.tweens.add({ targets: [homeBtn, retryBtn], scaleX: 1, scaleY: 1, duration: 800, delay: 300, ease: 'Elastic.easeOut' });
  }

  _buildKeepImproving(W, H, startY) {
    const cardW = 340, cardH = 120;
    const cardX = W / 2;
    const cardY = H * startY + cardH / 2;

    const cardContainer = this.add.container(cardX, cardY + 30).setDepth(5).setAlpha(0);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x132247, 1);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    cardBg.lineStyle(2, 0x335588, 1);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    
    // Deep drop shadow for the card
    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x000000, 0.4);
    cardShadow.fillRoundedRect(-cardW / 2, -cardH / 2 + 6, cardW, cardH, 20);
    cardContainer.add([cardShadow, cardBg]);

    // Title with lines
    const titleText = this.add.text(0, -cardH / 2 + 20, 'KEEP IMPROVING!', {
      fontSize: '14px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: '900', color: '#88CCFF',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 0, fill: true, alpha: 0.5 }
    }).setOrigin(0.5);
    cardContainer.add(titleText);

    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(2, 0x335588, 1);
    lineGfx.beginPath();
    lineGfx.moveTo(-90, -cardH / 2 + 20); lineGfx.lineTo(-65, -cardH / 2 + 20);
    lineGfx.moveTo(90, -cardH / 2 + 20); lineGfx.lineTo(65, -cardH / 2 + 20);
    lineGfx.strokePath();
    cardContainer.add(lineGfx);

    // Stats Grid
    const stat1X = -110, stat2X = 0, stat3X = 110;
    
    // Clean, simple styles without strokes to prevent blurriness
    const lblStyle = { 
      fontSize: '12px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#AACCFF',
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 2, fill: true, alpha: 0.8 }
    };
    const valStyle = { 
      fontSize: '28px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: '900', color: '#FFFFFF',
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 0, fill: true, alpha: 0.6 }
    };

    // Lines Cleared
    const ic1 = this.add.text(stat1X, -10, '⭐', { fontSize: '26px', shadow: { offsetX: 0, offsetY: 2, color: '#000000', fill: true, alpha: 0.4 } }).setOrigin(0.5);
    const val1 = this.add.text(stat1X, 22, this.linesCleared.toString(), valStyle).setOrigin(0.5);
    const lb1 = this.add.text(stat1X, 42, 'LINES', lblStyle).setOrigin(0.5);
    
    // Blocks Placed
    const ic2 = this.add.text(stat2X, -10, '🔳', { fontSize: '26px', shadow: { offsetX: 0, offsetY: 2, color: '#000000', fill: true, alpha: 0.4 } }).setOrigin(0.5);
    const val2 = this.add.text(stat2X, 22, this.blocksPlaced.toString(), valStyle).setOrigin(0.5);
    const lb2 = this.add.text(stat2X, 42, 'BLOCKS', lblStyle).setOrigin(0.5);

    // Combo
    const ic3 = this.add.text(stat3X, -10, '🏆', { fontSize: '26px', shadow: { offsetX: 0, offsetY: 2, color: '#000000', fill: true, alpha: 0.4 } }).setOrigin(0.5);
    const val3 = this.add.text(stat3X, 22, this.highestCombo.toString(), valStyle).setOrigin(0.5);
    const lb3 = this.add.text(stat3X, 42, 'COMBO', lblStyle).setOrigin(0.5);

    cardContainer.add([ic1, lb1, val1, ic2, lb2, val2, ic3, lb3, val3]);

    // Subtle Dividers
    const div = this.add.graphics();
    div.lineStyle(2, 0x1A2A5A, 0.8);
    div.moveTo(-56, -20); div.lineTo(-56, 45);
    div.moveTo(56, -20); div.lineTo(56, 45);
    div.strokePath();
    cardContainer.add(div);

    this.tweens.add({ targets: cardContainer, y: cardY, alpha: 1, duration: 800, delay: 400, ease: 'Back.easeOut' });
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
