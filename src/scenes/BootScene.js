import Phaser from 'phaser';
import { CELL_SIZE, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Background music
    this.load.audio('bgm', 'assets/audio/bgm.mp3');
    
    // Sound Effects
    this.load.audio('horizontalClear', 'assets/audio/horizontalClear.mp3');
    this.load.audio('combo1', 'assets/audio/combo1.mp3');
    this.load.audio('combo2', 'assets/audio/combo2.mp3');
    this.load.audio('smallBreak', 'assets/audio/smallBreak.mp3');
    this.load.audio('pieceInvalid', 'assets/audio/pieceInvalid.mp3');
    this.load.audio('gameStart', 'assets/audio/gameStart.mp3');
    this.load.audio('dragSound', 'assets/audio/drag-sound.mp3');
    this.load.audio('gameOver', 'assets/audio/gameOver.mp3');
    this.load.audio('noSpace', 'assets/audio/noSpace.mp3');
    this.load.audio('highScore', 'assets/audio/highScore.mp3');
    this.load.audio('buttonClick', 'assets/audio/buttonClick.mp3');
    this.load.audio('devlanceStudio', 'assets/audio/devlance_studio_sound.wav');
    
    // Voiceovers
    this.load.audio('voice_wow', 'assets/audio/voice_wow.mp3?v=3');
    this.load.audio('voice_good', 'assets/audio/voice_good.mp3?v=3');
    this.load.audio('voice_great', 'assets/audio/voice_great.mp3?v=3');
    this.load.audio('voice_excellent', 'assets/audio/voice_excellent.mp3?v=3');
    this.load.audio('voice_amazing', 'assets/audio/voice_amazing.mp3?v=3');
    this.load.audio('voice_wonderful', 'assets/audio/voice_wonderful.mp3?v=3');
    this.load.audio('voice_genius', 'assets/audio/voice_genius.mp3?v=3');
    this.load.audio('voice_master', 'assets/audio/voice_master.mp3?v=3');
  }

  create() {
    this.generateBlockTextures();
    this.generateParticleTextures();
    this.scene.start('SplashScene');
  }

  generateBlockTextures() {
    const size = CELL_SIZE;
    const r = 8;

    COLORS.forEach((color, index) => {
      const gfx = this.add.graphics();
      const baseColor = Phaser.Display.Color.IntegerToColor(color);

      // We'll draw 4 distinct bevel polygons around a center square 
      // to exactly match the classic raised-button block texture.
      const pad = Math.floor(size * 0.16); // The bevel thickness
      
      const topColor = baseColor.clone().lighten(35).color;
      const leftColor = baseColor.clone().lighten(15).color;
      const rightColor = baseColor.clone().darken(15).color;
      const bottomColor = baseColor.clone().darken(35).color;

      // Top Bevel
      gfx.fillStyle(topColor, 1);
      gfx.beginPath();
      gfx.moveTo(0, 0);
      gfx.lineTo(size, 0);
      gfx.lineTo(size - pad, pad);
      gfx.lineTo(pad, pad);
      gfx.closePath();
      gfx.fillPath();

      // Left Bevel
      gfx.fillStyle(leftColor, 1);
      gfx.beginPath();
      gfx.moveTo(0, 0);
      gfx.lineTo(pad, pad);
      gfx.lineTo(pad, size - pad);
      gfx.lineTo(0, size);
      gfx.closePath();
      gfx.fillPath();

      // Right Bevel
      gfx.fillStyle(rightColor, 1);
      gfx.beginPath();
      gfx.moveTo(size, 0);
      gfx.lineTo(size, size);
      gfx.lineTo(size - pad, size - pad);
      gfx.lineTo(size - pad, pad);
      gfx.closePath();
      gfx.fillPath();

      // Bottom Bevel
      gfx.fillStyle(bottomColor, 1);
      gfx.beginPath();
      gfx.moveTo(0, size);
      gfx.lineTo(pad, size - pad);
      gfx.lineTo(size - pad, size - pad);
      gfx.lineTo(size, size);
      gfx.closePath();
      gfx.fillPath();

      // Center flat color block
      gfx.fillStyle(color, 1);
      gfx.fillRect(pad, pad, size - pad * 2, size - pad * 2);

      gfx.generateTexture(`block_${index}`, size, size);
      gfx.destroy();
    });

    // Create hollow square for particles
    const hollowGfx = this.add.graphics();
    hollowGfx.lineStyle(3, 0xffffff, 1);
    hollowGfx.strokeRect(2, 2, 12, 12);
    hollowGfx.generateTexture('hollow_square', 16, 16);
    hollowGfx.destroy();

    // Ghost block texture (3D glass look)
    const ghostGfx = this.add.graphics();
    ghostGfx.fillStyle(0xffffff, 0.15);
    ghostGfx.fillRoundedRect(0, 0, size - 2, size - 2, r);
    ghostGfx.lineStyle(2, 0xffffff, 0.6);
    ghostGfx.strokeRoundedRect(1, 1, size - 4, size - 4, r - 1);
    ghostGfx.fillStyle(0xffffff, 0.1);
    ghostGfx.fillRoundedRect(3, 3, size - 8, size - 8, r - 2);
    ghostGfx.generateTexture('block_ghost', size, size);
    ghostGfx.destroy();

    // Invalid ghost block
    const invalidGfx = this.add.graphics();
    invalidGfx.fillStyle(0xff0000, 0.15);
    invalidGfx.fillRoundedRect(0, 0, size - 2, size - 2, r);
    invalidGfx.lineStyle(2, 0xff4444, 0.6);
    invalidGfx.strokeRoundedRect(1, 1, size - 4, size - 4, r - 1);
    invalidGfx.generateTexture('block_invalid', size, size);
    invalidGfx.destroy();

    // Empty cell texture (Clean, slightly rounded)
    const emptyGfx = this.add.graphics();
    emptyGfx.fillStyle(0x0C122A, 1);
    emptyGfx.fillRoundedRect(1, 1, size - 2, size - 2, r);
    
    emptyGfx.generateTexture('cell_empty', size, size);
    emptyGfx.destroy();

    // White flash texture
    const flashGfx = this.add.graphics();
    flashGfx.fillStyle(0xffffff, 1);
    flashGfx.fillRoundedRect(0, 0, size - 2, size - 2, r);
    flashGfx.generateTexture('block_flash', size, size);
    flashGfx.destroy();

    // Full screen flash overlay
    const overlayGfx = this.add.graphics();
    overlayGfx.fillStyle(0xffffff, 1);
    overlayGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlayGfx.generateTexture('screen_flash', GAME_WIDTH, GAME_HEIGHT);
    overlayGfx.destroy();
  }

  generateParticleTextures() {
    // Glowing circle particle
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.3);
    gfx.fillCircle(10, 10, 10);
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(10, 10, 6);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(10, 10, 3);
    gfx.generateTexture('particle', 20, 20);
    gfx.destroy();

    // Star-shaped sparkle particle
    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xffffff, 1);
    starGfx.fillRect(6, 0, 4, 16);
    starGfx.fillRect(0, 6, 16, 4);
    // Diagonal parts for 8-point star
    starGfx.fillStyle(0xffffff, 0.6);
    starGfx.fillRect(2, 2, 3, 3);
    starGfx.fillRect(11, 2, 3, 3);
    starGfx.fillRect(2, 11, 3, 3);
    starGfx.fillRect(11, 11, 3, 3);
    starGfx.generateTexture('particle_star', 16, 16);
    starGfx.destroy();

    // Large burst particle (ring)
    const ringGfx = this.add.graphics();
    ringGfx.lineStyle(3, 0xffffff, 1);
    ringGfx.strokeCircle(16, 16, 12);
    ringGfx.generateTexture('particle_ring', 32, 32);
    ringGfx.destroy();

    // Small square particle for debris
    const debrisGfx = this.add.graphics();
    debrisGfx.fillStyle(0xffffff, 1);
    debrisGfx.fillRoundedRect(0, 0, 8, 8, 2);
    debrisGfx.generateTexture('particle_debris', 8, 8);
    debrisGfx.destroy();
  }
}
