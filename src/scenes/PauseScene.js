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

    const cardW = 360, cardH = 540;
    const cardX = (GAME_WIDTH - cardW) / 2;
    const cardY = (GAME_HEIGHT - cardH) / 2;
    const cardContainer = this.add.container(0, 0).setAlpha(0).setScale(0.85).setDepth(5);

    // Deep rich drop shadow
    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x000000, 0.4);
    cardShadow.fillRoundedRect(cardX - 8, cardY + 16, cardW + 16, cardH, 28);
    cardContainer.add(cardShadow);

    // Sleek Navy Premium card
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0C1636, 1);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 24);
    // Crisp metallic-like outer rim
    cardBg.lineStyle(4, 0x2A4B99, 1);
    cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 24);
    cardBg.lineStyle(2, 0x5588FF, 0.5);
    cardBg.strokeRoundedRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 22);
    cardContainer.add(cardBg);

    // "PAUSED" Title (FHD premium look)
    const title = this.add.text(GAME_WIDTH / 2, cardY + 45, 'PAUSED', {
      fontSize: '42px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#FFFFFF',
      stroke: '#2A4B99', strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 4, fill: true, alpha: 0.6 }
    }).setOrigin(0.5);
    cardContainer.add(title);

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

    // --- Settings Toggles Panel ---
    const panelY = cardY + 95;
    const panelH = 150;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0A153A, 1); // Dark blue background for toggles
    panelBg.fillRoundedRect(cardX + 20, panelY, cardW - 40, panelH, 16);
    panelBg.lineStyle(2, 0x1A2558, 1);
    panelBg.strokeRoundedRect(cardX + 20, panelY, cardW - 40, panelH, 16);
    cardContainer.add(panelBg);

    const createToggle = (yOffset, iconText, labelText, getFn, toggleFn) => {
      const startY = panelY + yOffset;
      
      const icon = this.add.text(cardX + 35, startY, iconText, { fontSize: '20px', color: '#4488FF' }).setOrigin(0, 0.5);
      cardContainer.add(icon);
      
      const lbl = this.add.text(cardX + 65, startY, labelText, {
        fontSize: '18px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: 'bold', color: '#FFFFFF'
      }).setOrigin(0, 0.5);
      cardContainer.add(lbl);

      const tX = cardX + cardW - 60;
      const tBg = this.add.graphics();
      const drawToggle = (isOn) => {
        tBg.clear();
        tBg.fillStyle(isOn ? 0x5ccc00 : 0x445577, 1);
        tBg.fillRoundedRect(tX - 25, startY - 14, 50, 28, 14);
        tBg.fillStyle(0xFFFFFF, 1);
        tBg.fillCircle(isOn ? tX + 10 : tX - 10, startY, 11);
      };

      let currentState = getFn();
      drawToggle(currentState);

      // Hit area for the toggle switch
      const hitArea = new Phaser.Geom.Rectangle(tX - 35, startY - 20, 70, 40);
      const zone = this.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT); // Dummy zone, we use container logic but it's easier to just use a graphic.
      
      // Let's use an invisible rectangle for the interactive area instead of a zone
      const interactRect = this.add.rectangle(tX, startY, 70, 40, 0x000000, 0).setInteractive({ useHandCursor: true });
      interactRect.on('pointerdown', () => {
        SoundManager.uiClick();
        currentState = toggleFn();
        drawToggle(currentState);
      });
      
      cardContainer.add(tBg);
      cardContainer.add(interactRect);
    };

    createToggle(25, '🔊', 'SOUND', () => SoundManager.isSoundEnabled(), () => SoundManager.toggleSound());
    createToggle(75, '🎵', 'MUSIC', () => SoundManager.isMusicEnabled(), () => SoundManager.toggleMusic());
    createToggle(125, '📳', 'VIBRATION', () => SoundManager.isHapticsEnabled(), () => SoundManager.toggleHaptics());

    // --- Buttons ---
    const btnStartY = panelY + panelH + 40;
    const btnSpacing = 75;

    const { container: btn1 } = ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY, 260, 60, 'RESUME', '▶', 'primary', () => this.resumeGame());
    const { container: btn2 } = ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY + btnSpacing, 260, 60, 'RESTART', '⟳', 'secondary', () => this.restartGame());
    const { container: btn3 } = ButtonFactory.create(this, GAME_WIDTH / 2, btnStartY + btnSpacing * 2, 260, 60, 'HOME', '🏠', 'tertiary', () => this.goToMenu());
    
    cardContainer.add(btn1);
    cardContainer.add(btn2);
    cardContainer.add(btn3);

    // Classy, premium smooth scale and fade entry animation
    this.tweens.add({
      targets: cardContainer,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 250, ease: 'Cubic.easeOut'
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
