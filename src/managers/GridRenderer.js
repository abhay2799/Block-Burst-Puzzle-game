import {
  GRID_SIZE, CELL_SIZE, GRID_PADDING, GRID_OFFSET_X, GRID_OFFSET_Y,
  GAME_WIDTH, GAME_HEIGHT, VISUAL_SETTINGS
} from '../utils/Constants.js';

export class GridRenderer {
  constructor(scene) {
    this.scene = scene;
    this.glowDots = [];
    this.gridSprites = [];
    this.blockSprites = [];
    this.glowDotsGfx = null;
    this._glowColor = 0x88CCFF;
    this._glowIntensity = 0.5;
    this._dotWaveSpeed = 1.0;
  }

  create() {
    const startX = GRID_OFFSET_X;
    const startY = GRID_OFFSET_Y;
    const totalSize = GRID_SIZE * (CELL_SIZE + GRID_PADDING) - GRID_PADDING;

    const gridBg = this.scene.add.graphics();
    // Stronger shadow under the board
    gridBg.fillStyle(0x000000, 0.4);
    gridBg.fillRoundedRect(startX - 10, startY - 4, totalSize + 20, totalSize + 20, 16);
    
    // Main board base (Glassmorphism white tint)
    gridBg.fillStyle(0xffffff, 0.05);
    gridBg.fillRoundedRect(startX - 10, startY - 10, totalSize + 20, totalSize + 20, 16);
    
    // Inner white stroke for glass highlight
    gridBg.lineStyle(1.5, 0xffffff, 0.2);
    gridBg.strokeRoundedRect(startX - 10, startY - 10, totalSize + 20, totalSize + 20, 16);

    this._createCells(startX, startY);
    this._initBlockSprites();
  }

  _createGlowDots(startX, startY, totalSize) {
    // Disabled for Block Blast style
  }

  _drawDots(time) {
    // Disabled
  }

  _createCells(startX, startY) {
    this.gridSprites = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.gridSprites[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = startX + c * (CELL_SIZE + GRID_PADDING);
        const y = startY + r * (CELL_SIZE + GRID_PADDING);
        const cell = this.scene.add.image(x, y, 'cell_empty').setOrigin(0);
        this.gridSprites[r][c] = cell;
      }
    }
  }

  _initBlockSprites() {
    this.blockSprites = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.blockSprites[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        this.blockSprites[r][c] = null;
      }
    }
  }

  pulseGridBorder() {
    if (!this._dotPositions || this._dotPositions.length === 0) return;
    let elapsed = 0;
    const dur = this._dotPositions.length * 8 + 300;

    const event = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        elapsed += 16;
        if (elapsed > dur) { event.remove(); return; }
        this.glowDotsGfx.clear();
        const time = this.scene.time.now / 1000;
        const color = this._glowColor;
        const speed = this._dotWaveSpeed;
        for (let i = 0; i < this._dotPositions.length; i++) {
          const pos = this._dotPositions[i];
          const wave = elapsed - i * 8;
          const pulseScale = (wave > 0 && wave < 300) ? 1 + 0.5 * Math.sin(wave / 300 * Math.PI) : 1;
          const alpha = (wave > 0 && wave < 300) ? 1 : 0.35 + Math.sin(time * speed + (i / this._dotPositions.length) * Math.PI * 2) * 0.25;
          const radius = 1.5 * pulseScale;
          this.glowDotsGfx.fillStyle(color, alpha * 0.3);
          this.glowDotsGfx.fillCircle(pos.x, pos.y, radius + 1.5);
          this.glowDotsGfx.fillStyle(color, alpha * 0.9);
          this.glowDotsGfx.fillCircle(pos.x, pos.y, radius);
        }
      }
    });
  }

  getBlockSprite(row, col) {
    if (!this.blockSprites[row]) return null;
    return this.blockSprites[row][col] || null;
  }

  setBlockSprite(row, col, sprite) {
    if (!this.blockSprites[row]) return;
    this.blockSprites[row][col] = sprite;
  }

  clearBlockSprite(row, col) {
    if (!this.blockSprites[row]) return;
    this.blockSprites[row][col] = null;
  }

  shutdown() {
    if (this._dotTimer) { this._dotTimer.remove(); this._dotTimer = null; }
    if (this.glowDotsGfx) { this.glowDotsGfx.destroy(); }
    this.glowDotsGfx = null;
    this.gridSprites = [];
    this.blockSprites = [];
    this._dotPositions = [];
  }
}
