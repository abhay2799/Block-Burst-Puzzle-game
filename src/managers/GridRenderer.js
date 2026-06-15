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
    // Deep shadow under the whole board
    gridBg.fillStyle(0x000000, 0.4);
    gridBg.fillRoundedRect(startX - 14, startY - 10, totalSize + 28, totalSize + 28, 18);
    
    // Main board base
    gridBg.fillStyle(0x1a2850, 0.5);
    gridBg.fillRoundedRect(startX - 18, startY - 18, totalSize + 36, totalSize + 36, 22);
    
    // Inset board background
    gridBg.fillStyle(0x080E24, 1);
    gridBg.fillRoundedRect(startX - 14, startY - 14, totalSize + 28, totalSize + 28, 18);
    
    // Inner shadow for board
    gridBg.lineStyle(3, 0x000000, 0.6);
    gridBg.strokeRoundedRect(startX - 14, startY - 14, totalSize + 28, totalSize + 28, 18);
    // Highlight at bottom
    gridBg.lineStyle(2, 0x2A3A6A, 0.6);
    gridBg.beginPath();
    gridBg.arc(startX - 14 + 18, startY - 14 + totalSize + 28 - 18, 18, Math.PI / 2, Math.PI);
    gridBg.lineTo(startX - 14 + totalSize + 28 - 18, startY - 14 + totalSize + 28);
    gridBg.arc(startX - 14 + totalSize + 28 - 18, startY - 14 + totalSize + 28 - 18, 18, 0, Math.PI / 2);
    gridBg.strokePath();

    this._createGlowDots(startX, startY, totalSize);
    this._createCells(startX, startY);
    this._initBlockSprites();
  }

  _createGlowDots(startX, startY, totalSize) {
    const dotSpacing = 11;
    const padding = 6;
    const left = startX - padding;
    const top = startY - padding;
    const right = startX + totalSize + padding;
    const bottom = startY + totalSize + padding;

    const positions = [];
    for (let x = left; x <= right; x += dotSpacing) positions.push({ x, y: top - 3 });
    for (let y = top + dotSpacing; y <= bottom; y += dotSpacing) positions.push({ x: right + 3, y });
    for (let x = right; x >= left; x -= dotSpacing) positions.push({ x, y: bottom + 3 });
    for (let y = bottom - dotSpacing; y >= top; y -= dotSpacing) positions.push({ x: left - 3, y });

    this.glowDotsGfx = this.scene.add.graphics().setDepth(1);
    this._dotPositions = positions;
    this._drawDots(0);

    this._dotTimer = this.scene.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        const time = this.scene.time.now / 1000;
        this._drawDots(time);
      }
    });
  }

  _drawDots(time) {
    this.glowDotsGfx.clear();
    const color = this._glowColor;
    const intensity = this._glowIntensity;
    const speed = this._dotWaveSpeed;
    for (let i = 0; i < this._dotPositions.length; i++) {
      const pos = this._dotPositions[i];
      const phase = (i / this._dotPositions.length) * Math.PI * 2;
      const alpha = (0.35 + Math.sin(time * speed + phase) * 0.25) * intensity;
      this.glowDotsGfx.fillStyle(color, alpha * 0.3);
      this.glowDotsGfx.fillCircle(pos.x, pos.y, 3);
      this.glowDotsGfx.fillStyle(color, alpha * 0.9);
      this.glowDotsGfx.fillCircle(pos.x, pos.y, 1.5);
    }
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
