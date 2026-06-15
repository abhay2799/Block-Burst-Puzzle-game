import Phaser from 'phaser';
import { CELL_SIZE, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.generateBlockTextures();
    this.generateParticleTextures();
    this.scene.start('SplashScene');
  }

  generateBlockTextures() {
    const size = CELL_SIZE;
    const r = 10; // Slightly rounder for 3D look

    COLORS.forEach((color, index) => {
      const gfx = this.add.graphics();
      const baseColor = Phaser.Display.Color.IntegerToColor(color);

      // 1. Deep Drop Shadow (offset right/bottom)
      gfx.fillStyle(0x000000, 0.4);
      gfx.fillRoundedRect(2, 4, size - 2, size - 2, r);

      // 2. Base Dark Layer (adds bottom depth)
      const darkColor = baseColor.clone().darken(40);
      gfx.fillStyle(darkColor.color, 1);
      gfx.fillRoundedRect(0, 2, size - 2, size - 2, r);

      // 3. Main Body
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(0, 0, size - 2, size - 4, r);

      // 4. Inner Gradient / Top Edge Highlight
      const lightColor = baseColor.clone().lighten(30);
      gfx.fillStyle(lightColor.color, 0.8);
      gfx.fillRoundedRect(1, 1, size - 4, (size - 4) * 0.4, { tl: r - 1, tr: r - 1, bl: 4, br: 4 });

      // 5. Specular Glossy Shine (Curved gel look at top)
      gfx.fillStyle(0xffffff, 0.6);
      gfx.fillRoundedRect(4, 2, size - 10, (size - 4) * 0.25, { tl: r - 3, tr: r - 3, bl: 5, br: 5 });

      // 6. Bottom Inner Shadow (Creates convex bulge)
      const shadowBevel = baseColor.clone().darken(25);
      gfx.fillStyle(shadowBevel.color, 0.6);
      gfx.fillRoundedRect(2, size - 12, size - 6, 6, { tl: 0, tr: 0, bl: r - 2, br: r - 2 });

      // 7. Bright specular dot
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillCircle(8, 8, 3);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(7, 7, 1.5);

      gfx.generateTexture(`block_${index}`, size, size);
      gfx.destroy();
    });

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

    // Empty cell texture (Deep inset look)
    const emptyGfx = this.add.graphics();
    emptyGfx.fillStyle(0x0F1530, 1);
    emptyGfx.fillRoundedRect(0, 0, size, size, r);
    // Inner dark shadow (top-left)
    emptyGfx.lineStyle(2, 0x050815, 0.8);
    emptyGfx.beginPath();
    emptyGfx.arc(r, r, r, Math.PI, Math.PI * 1.5);
    emptyGfx.lineTo(size - r, 0);
    emptyGfx.moveTo(0, size - r);
    emptyGfx.lineTo(0, r);
    emptyGfx.strokePath();
    // Inner light highlight (bottom-right)
    emptyGfx.lineStyle(2, 0x2A3A6A, 0.5);
    emptyGfx.beginPath();
    emptyGfx.arc(size - r, size - r, r, 0, Math.PI * 0.5);
    emptyGfx.lineTo(r, size);
    emptyGfx.moveTo(size, r);
    emptyGfx.lineTo(size, size - r);
    emptyGfx.strokePath();
    
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
