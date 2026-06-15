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
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);

    const cardW = 320, cardH = 290;
    const cardX = (GAME_WIDTH - cardW) / 2;
    const cardY = (GAME_HEIGHT - cardH) / 2;

    const cardOuter = this.add.graphics();
    cardOuter.fillStyle(0x5B7CC4, 1);
    cardOuter.fillRoundedRect(cardX - 4, cardY - 4, cardW + 8, cardH + 8, 20);

    const card = this.add.graphics();
    card.fillStyle(0x3B5BA8, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 18);

    this.add.text(GAME_WIDTH / 2, cardY + 34, 'Settings', {
      fontSize: '24px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5);

    const closeBtn = this.add.text(cardX + cardW - 20, cardY + 14, '✕', {
      fontSize: '24px', fontFamily: '"Fredoka", sans-serif', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => { SoundManager.uiClick(); this.resumeGame(); });

    const btnStartY = cardY + 90;
    const btnSpacing = 64;

    ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY, 250, 48, 'Home', '🏠', 'primary', () => this.goToMenu());
    ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY + btnSpacing, 250, 48, 'Replay', '🔄', 'accent', () => this.restartGame());
    ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY + btnSpacing * 2, 250, 48, 'Resume', '▶', 'secondary', () => this.resumeGame());
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
