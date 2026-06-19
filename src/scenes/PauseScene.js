import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';
import { ButtonFactory } from '../ui/ButtonFactory.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.parentScene = data.parentScene || 'GameScene';
    this.score = data.score || 0;
    this._closing = false;
  }

  create() {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);

    const cardW = 340, cardH = 340;
    const cardX = (GAME_WIDTH - cardW) / 2;
    const cardY = (GAME_HEIGHT - cardH) / 2;

    const cardContainer = this.add.container(0, -100).setAlpha(0).setDepth(5);

    // Drop shadow
    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x000000, 0.3);
    cardShadow.fillRoundedRect(cardX - 6, cardY + 12, cardW + 12, cardH, 32);
    cardContainer.add(cardShadow);

    // Toy-box thick border (outer rim)
    const cardBorder = this.add.graphics();
    cardBorder.fillStyle(0x33BBFF, 1); // Bright Cyan
    cardBorder.fillRoundedRect(cardX - 8, cardY - 8, cardW + 16, cardH + 20, 32);
    cardContainer.add(cardBorder);

    // Main card interior (bright white)
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xFFFFFF, 1);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 24);
    cardContainer.add(cardBg);

    // Inner bright glow/rim
    const innerRim = this.add.graphics();
    innerRim.lineStyle(6, 0xAAEEFF, 0.8);
    innerRim.strokeRoundedRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 18);
    cardContainer.add(innerRim);

    const title = this.add.text(GAME_WIDTH / 2, cardY + 40, 'PAUSED', {
      fontSize: '40px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '800', color: '#FF44AA',
      stroke: '#AA1155', strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#AA1155', blur: 0, fill: true }
    }).setOrigin(0.5);
    cardContainer.add(title);

    const divider = this.add.graphics();
    divider.fillStyle(0xEEEEEE, 1);
    divider.fillRect(cardX + 50, cardY + 75, cardW - 100, 6);
    cardContainer.add(divider);

    // Close Button (Toy style X)
    const closeBtnBg = this.add.graphics();
    closeBtnBg.fillStyle(0xFF5533, 1);
    closeBtnBg.fillCircle(cardX + cardW - 10, cardY + 10, 20);
    closeBtnBg.lineStyle(4, 0xFFFFFF, 1);
    closeBtnBg.strokeCircle(cardX + cardW - 10, cardY + 10, 20);
    cardContainer.add(closeBtnBg);

    const closeBtn = this.add.text(cardX + cardW - 10, cardY + 10, '✕', {
      fontSize: '24px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerdown', () => { SoundManager.uiClick(); this.resumeGame(); });
    cardContainer.add(closeBtn);

    const btnStartY = cardY + 130;
    const btnSpacing = 80;

    const { container: btn1 } = ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY, 260, 64, 'Resume', '▶', 'secondary', () => this.resumeGame());
    const { container: btn2 } = ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY + btnSpacing, 260, 64, 'Replay', '🔄', 'accent', () => this.restartGame());
    const { container: btn3 } = ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY + btnSpacing * 2, 260, 64, 'Home', '🏠', 'danger', () => this.goToMenu());
    
    cardContainer.add(btn1);
    cardContainer.add(btn2);
    cardContainer.add(btn3);

    // Bouncy entry animation
    this.tweens.add({
      targets: cardContainer,
      y: 0, alpha: 1,
      duration: 800, ease: 'Elastic.easeOut'
    });
  }

  resumeGame() {
    if (this._closing) return;
    this._closing = true;
    const parent = this.scene.get(this.parentScene);
    if (parent) {
      parent.isPaused = false;
      if (parent.input) parent.input.enabled = true;
    }
    this.scene.resume(this.parentScene);
    this.scene.stop('PauseScene');
  }

  restartGame() {
    if (this._closing) return;
    this._closing = true;
    this.scene.stop(this.parentScene);
    this.scene.start('GameScene');
  }

  goToMenu() {
    if (this._closing) return;
    this._closing = true;
    this.scene.stop(this.parentScene);
    this.scene.start('MenuScene');
  }
}
