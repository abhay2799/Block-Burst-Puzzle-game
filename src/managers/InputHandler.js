import Phaser from 'phaser';
import {
  GRID_SIZE, CELL_SIZE, GRID_PADDING, GRID_OFFSET_X, GRID_OFFSET_Y,
  PIECE_SCALE_SMALL, DRAG_FINGER_OFFSET_Y, TIMING, VISUAL_SETTINGS, COLORS
} from '../utils/Constants.js';
import { SoundManager } from '../audio/SoundManager.js';
import { ObjectPool } from '../utils/ObjectPool.js';

export class InputHandler {
  constructor(scene) {
    this.scene = scene;
    this.ghostSprites = [];
    this.predictionSprites = [];
    this.predictionTweens = [];
    this._lastGhostRow = -1;
    this._lastGhostCol = -1;
    this._shadowGfx = null;

    this._ghostPool = new ObjectPool(
      () => scene.add.image(0, 0, 'block_ghost').setOrigin(0).setDepth(5).setVisible(false),
      (obj) => { obj.setVisible(false).setPosition(0, 0).setTexture('block_ghost').setAlpha(1); },
      10
    );

    this.isDragging = false;
    this.dragPointer = null;
    this.lastPointerPos = { x: 0, y: 0 };
    this.dragInsideBox = false;

    this.scene.events.on('update', this.update, this);
  }

  onDragStart(container, index, pieces, pieceContainers) {
    if (this.scene.isAnimating) return;
    container._isBeingDragged = true;
    const scene = this.scene;

    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: 1.1, scaleY: 1.1,
      duration: 100, ease: 'Back.easeOut',
      onComplete: () => container.setScale(1)
    });

    container.setDepth(100);

    const piece = pieces[index];
    const offsetX = -(piece.width * CELL_SIZE) / 2;
    const offsetY = -(piece.height * CELL_SIZE) / 2 + DRAG_FINGER_OFFSET_Y;

    const cellTotal = CELL_SIZE + GRID_PADDING;

    for (const sprite of container.list) {
      if (sprite._cellCol === undefined) continue;

      const targetX = offsetX + sprite._cellCol * cellTotal;
      const targetY = offsetY + sprite._cellRow * cellTotal;
      
      scene.tweens.killTweensOf(sprite);
      scene.tweens.add({
        targets: sprite,
        x: targetX,
        y: targetY,
        scaleX: 1,
        scaleY: 1,
        duration: 90, // Blazing fast pickup snap
        ease: 'Cubic.easeOut' // Smoother, faster curve than Back for ultra-responsiveness
      });
    }

    if (VISUAL_SETTINGS.settleAnimation) {
      for (let p = 0; p < pieceContainers.length; p++) {
        if (p !== index && pieceContainers[p]) {
          scene.tweens.add({
            targets: pieceContainers[p],
            scaleX: 0.85, scaleY: 0.85, alpha: 0.6,
            duration: 150, ease: 'Sine.easeOut'
          });
        }
      }
    }

    this.isDragging = true;
    this.dragPointer = this.scene.input.activePointer;
    this.lastPointerPos.x = this.dragPointer.x;
    this.lastPointerPos.y = this.dragPointer.y;
    this.dragInsideBox = false;

    SoundManager.startDragSound();
    SoundManager.piecePickup();
  }

  onDrag(container, pointer, index, pieces, board) {
    if (this.scene.isAnimating || !container._isBeingDragged) return;
    
    // Visually update piece position instantly every frame for buttery smoothness
    container.setPosition(pointer.x, pointer.y);

    // Always recalculate exact grid position instantly for zero-latency dragging
    this._lastCalcX = pointer.x;
    this._lastCalcY = pointer.y;

    const piece = pieces[index];
    const gridPos = this.getGridPosition(pointer.x, pointer.y, piece);

    // Try exact position first, then snap search for ghost preview
    let displayPos = null;
    if (gridPos && board.canPlace(piece, gridPos.row, gridPos.col)) {
      displayPos = gridPos;
    } else {
      displayPos = this._findNearbyValid(pointer.x, pointer.y, piece, board);
    }

    const displayRow = displayPos ? displayPos.row : -1;
    const displayCol = displayPos ? displayPos.col : -1;

    if (this._lastGhostRow === displayRow && this._lastGhostCol === displayCol) return;
    this._lastGhostRow = displayRow;
    this._lastGhostCol = displayCol;

    this.clearGhosts();
    this.clearPredictions();

    if (displayPos) {
      this.showGhost(piece, displayPos.row, displayPos.col, true);
      const prediction = board.predictClears(piece, displayPos.row, displayPos.col);
      if (prediction.rows.length > 0 || prediction.cols.length > 0) {
        this.showPrediction(prediction, piece);
      }
    }

    // Determine if drag is inside the main empty box for the sound sync
    const cellTotal = CELL_SIZE + GRID_PADDING;
    this.dragInsideBox = pointer.x >= GRID_OFFSET_X && pointer.x <= GRID_OFFSET_X + GRID_SIZE * cellTotal &&
                         pointer.y >= GRID_OFFSET_Y && pointer.y <= GRID_OFFSET_Y + GRID_SIZE * cellTotal;
  }

  _findNearbyValid(pointerX, pointerY, piece, board) {
    const cellTotal = CELL_SIZE + GRID_PADDING;
    const offsetX = -(piece.width * CELL_SIZE) / 2;
    const offsetY = -(piece.height * CELL_SIZE) / 2 + DRAG_FINGER_OFFSET_Y;

    const pieceWorldCenterX = pointerX + offsetX + (piece.width * CELL_SIZE) / 2;
    const pieceWorldCenterY = pointerY + offsetY + (piece.height * CELL_SIZE) / 2;

    const exactCol = (pieceWorldCenterX - GRID_OFFSET_X - (piece.width - 1) * cellTotal / 2) / cellTotal;
    const exactRow = (pieceWorldCenterY - GRID_OFFSET_Y - (piece.height - 1) * cellTotal / 2) / cellTotal;

    const baseCol = Math.round(exactCol);
    const baseRow = Math.round(exactRow);

    let bestPos = null;
    let bestDist = Infinity;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = baseRow + dr;
        const c = baseCol + dc;
        if (!this._isValidPlacement(r, c, piece, board)) continue;
        const dist = (r - exactRow) ** 2 + (c - exactCol) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = { row: r, col: c };
        }
      }
    }

    return bestPos;
  }

  onDragEnd(container, pointer, index, pieces, board, pieceContainers) {
    const scene = this.scene;
    this.isDragging = false;
    container._isBeingDragged = false;
    SoundManager.stopDragSound();

    if (scene.isAnimating) { this.returnPieceToSlot(container, index, pieces); return false; }
    this.clearGhosts();
    this.clearPredictions();
    this._lastGhostRow = -1;
    this._lastGhostCol = -1;

    if (VISUAL_SETTINGS.settleAnimation) {
      for (let p = 0; p < pieceContainers.length; p++) {
        if (p !== index && pieceContainers[p]) {
          scene.tweens.add({
            targets: pieceContainers[p],
            scaleX: 1, scaleY: 1, alpha: 1,
            duration: 150, ease: 'Sine.easeOut'
          });
        }
      }
    }

    const piece = pieces[index];
    const gridPos = this.findBestPlacement(pointer.x, pointer.y, piece, board);

    if (gridPos) {
      return gridPos;
    } else {
      SoundManager.pieceInvalid();
      this.returnPieceToSlot(container, index, pieces);
      return false;
    }
  }

  findBestPlacement(pointerX, pointerY, piece, board) {
    const cellTotal = CELL_SIZE + GRID_PADDING;
    const offsetX = -(piece.width * CELL_SIZE) / 2;
    const offsetY = -(piece.height * CELL_SIZE) / 2 + DRAG_FINGER_OFFSET_Y;

    const pieceWorldCenterX = pointerX + offsetX + (piece.width * CELL_SIZE) / 2;
    const pieceWorldCenterY = pointerY + offsetY + (piece.height * CELL_SIZE) / 2;

    const exactCol = (pieceWorldCenterX - GRID_OFFSET_X - (piece.width - 1) * cellTotal / 2) / cellTotal;
    const exactRow = (pieceWorldCenterY - GRID_OFFSET_Y - (piece.height - 1) * cellTotal / 2) / cellTotal;

    const baseCol = Math.round(exactCol);
    const baseRow = Math.round(exactRow);

    // Check exact position first
    if (this._isValidPlacement(baseRow, baseCol, piece, board)) {
      return { row: baseRow, col: baseCol };
    }

    // Spiral search: check neighbors within 2-cell radius, sorted by distance
    const maxRadius = 2;
    let bestPos = null;
    let bestDist = Infinity;

    for (let dr = -maxRadius; dr <= maxRadius; dr++) {
      for (let dc = -maxRadius; dc <= maxRadius; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = baseRow + dr;
        const c = baseCol + dc;
        if (!this._isValidPlacement(r, c, piece, board)) continue;

        // Distance from the floating-point exact position (sub-cell precision)
        const dist = (r - exactRow) ** 2 + (c - exactCol) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = { row: r, col: c };
        }
      }
    }

    return bestPos;
  }

  _isValidPlacement(row, col, piece, board) {
    if (row < 0 || col < 0) return false;
    return board.canPlace(piece, row, col);
  }

  getGridPosition(pointerX, pointerY, piece) {
    const cellTotal = CELL_SIZE + GRID_PADDING;
    const offsetX = -(piece.width * CELL_SIZE) / 2;
    const offsetY = -(piece.height * CELL_SIZE) / 2 + DRAG_FINGER_OFFSET_Y;

    const pieceWorldCenterX = pointerX + offsetX + (piece.width * CELL_SIZE) / 2;
    const pieceWorldCenterY = pointerY + offsetY + (piece.height * CELL_SIZE) / 2;

    const col = Math.round((pieceWorldCenterX - GRID_OFFSET_X - (piece.width - 1) * cellTotal / 2) / cellTotal);
    const row = Math.round((pieceWorldCenterY - GRID_OFFSET_Y - (piece.height - 1) * cellTotal / 2) / cellTotal);

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    if (row + piece.height > GRID_SIZE || col + piece.width > GRID_SIZE) return null;
    return { row, col };
  }

  showGhost(piece, gridRow, gridCol, isValid) {
    const textureKey = isValid ? 'block_ghost' : 'block_invalid';
    const cellTotal = CELL_SIZE + GRID_PADDING;

    for (const cell of piece.cells) {
      const r = gridRow + cell.row;
      const c = gridCol + cell.col;
      const x = GRID_OFFSET_X + c * cellTotal;
      const y = GRID_OFFSET_Y + r * cellTotal;
      const ghost = this._ghostPool.acquire();
      ghost.setTexture(textureKey).setPosition(x, y).setVisible(true);
      this.ghostSprites.push(ghost);
    }

    // Drop shadow when valid
    if (isValid) {
      this._showDropShadow(piece, gridRow, gridCol, cellTotal);
    }
  }

  _showDropShadow(piece, gridRow, gridCol, cellTotal) {
    if (!this._shadowGfx) {
      this._shadowGfx = this.scene.add.graphics().setDepth(3);
    }
    this._shadowGfx.clear().setAlpha(1).setVisible(true);
    this._shadowGfx.fillStyle(0x000000, 0.15);

    for (const cell of piece.cells) {
      const x = GRID_OFFSET_X + (gridCol + cell.col) * cellTotal + 3;
      const y = GRID_OFFSET_Y + (gridRow + cell.row) * cellTotal + 3;
      this._shadowGfx.fillRoundedRect(x, y, CELL_SIZE + 2, CELL_SIZE + 2, 6);
    }
  }

  clearGhosts() {
    for (const ghost of this.ghostSprites) {
      this._ghostPool.release(ghost);
    }
    this.ghostSprites = [];

    if (this._shadowGfx) {
      this._shadowGfx.clear().setVisible(false);
    }
  }

  showPrediction(prediction, piece) {
    const scene = this.scene;
    const cellTotal = CELL_SIZE + GRID_PADDING;
    const totalW = GRID_SIZE * cellTotal - GRID_PADDING;

    // Determine the glow color (use the piece's color, or a rainbow/bright default)
    let glowColorInt = 0xFFFFFF;
    if (piece && typeof piece.colorIndex !== 'undefined' && COLORS[piece.colorIndex]) {
        glowColorInt = COLORS[piece.colorIndex];
    }
    const glowColor = Phaser.Display.Color.IntegerToColor(glowColorInt).lighten(20).color;

    // Add a single graphics object for all the glowing boxes
    const neonGfx = scene.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    this.predictionSprites.push(neonGfx);

    const drawNeonRect = (x, y, w, h) => {
        // Inner translucent fill
        neonGfx.fillStyle(glowColor, 0.25);
        neonGfx.fillRect(x, y, w, h);
        
        // Intense glow outer border
        neonGfx.lineStyle(8, glowColor, 0.4);
        neonGfx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        
        // Medium inner border
        neonGfx.lineStyle(4, glowColor, 0.9);
        neonGfx.strokeRect(x, y, w, h);
        
        // Core bright white stroke
        neonGfx.lineStyle(2, 0xFFFFFF, 1);
        neonGfx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    };

    // Draw all rows and cols
    for (const r of prediction.rows) {
      const y = GRID_OFFSET_Y + r * cellTotal;
      drawNeonRect(GRID_OFFSET_X, y, totalW, CELL_SIZE);
    }
    for (const c of prediction.cols) {
      const x = GRID_OFFSET_X + c * cellTotal;
      drawNeonRect(x, GRID_OFFSET_Y, CELL_SIZE, totalW);
    }

    // Pulse the neon glow
    const tw = scene.tweens.add({
      targets: neonGfx, alpha: 0.6,
      duration: 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.predictionTweens.push(tw);
  }

  _createNeonSparkles(prediction, color, totalW, cellTotal) {
    const scene = this.scene;
    
    // Function to spawn a tiny drifting star
    const spawnStar = (x, y) => {
      const star = scene.add.rectangle(x, y, 4, 4, color).setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
      this.predictionSprites.push(star);
      
      const tw = scene.tweens.add({
        targets: star,
        y: y - 15 - Math.random() * 20,
        alpha: 0,
        scale: 0,
        duration: 500 + Math.random() * 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (this.predictionSprites.includes(star)) {
             star.destroy();
          }
        }
      });
      this.predictionTweens.push(tw);
    };

    // Distribute stars randomly along the clears
    for (const r of prediction.rows) {
      for (let i = 0; i < 6; i++) {
        const x = GRID_OFFSET_X + Math.random() * totalW;
        const y = GRID_OFFSET_Y + r * cellTotal + Math.random() * CELL_SIZE;
        spawnStar(x, y);
      }
    }
    for (const c of prediction.cols) {
      for (let i = 0; i < 6; i++) {
        const x = GRID_OFFSET_X + c * cellTotal + Math.random() * CELL_SIZE;
        const y = GRID_OFFSET_Y + Math.random() * totalW;
        spawnStar(x, y);
      }
    }
  }

  clearPredictions() {
    for (const tw of this.predictionTweens) tw.stop();
    this.predictionTweens = [];
    for (const sprite of this.predictionSprites) sprite.destroy();
    this.predictionSprites = [];
  }

  returnPieceToSlot(container, index, pieces) {
    const piece = pieces[index];
    const cellSize = CELL_SIZE * PIECE_SCALE_SMALL;
    const offsetX = -(piece.width * cellSize) / 2;
    const offsetY = -(piece.height * cellSize) / 2;

    this.scene.tweens.killTweensOf(container);
    this.scene.tweens.add({
      targets: container,
      x: container.originalX, y: container.originalY,
      duration: TIMING.PIECE_RETURN_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => {
        container.setDepth(10);
      }
    });

    for (const sprite of container.list) {
      if (sprite._cellCol === undefined) continue;
      this.scene.tweens.killTweensOf(sprite);
      this.scene.tweens.add({
        targets: sprite,
        x: offsetX + sprite._cellCol * cellSize,
        y: offsetY + sprite._cellRow * cellSize,
        scaleX: PIECE_SCALE_SMALL,
        scaleY: PIECE_SCALE_SMALL,
        duration: TIMING.PIECE_RETURN_DURATION,
        ease: 'Back.easeOut'
      });
    }
  }

  update(time, delta) {
    if (!this.isDragging || !this.dragPointer) return;

    let dx = this.dragPointer.x - this.lastPointerPos.x;
    let dy = this.dragPointer.y - this.lastPointerPos.y;
    
    let speed = 0;
    if (delta > 0) {
      speed = Math.sqrt(dx * dx + dy * dy) / delta;
    }
    if (isNaN(speed) || !isFinite(speed)) speed = 0;

    this.lastPointerPos.x = this.dragPointer.x;
    this.lastPointerPos.y = this.dragPointer.y;

    SoundManager.updateDragSound(this.dragInsideBox, speed);
  }

  shutdown() {
    this.scene.events.off('update', this.update, this);
    this.clearGhosts();
    this.clearPredictions();
    if (this._shadowGfx) { this._shadowGfx.destroy(); this._shadowGfx = null; }
    if (this._ghostPool) {
      for (const item of this._ghostPool._pool) {
        if (item && item.destroy) item.destroy();
      }
      this._ghostPool._pool = [];
    }
  }
}
