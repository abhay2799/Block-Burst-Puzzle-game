import Phaser from 'phaser';
import {
  GRID_SIZE, CELL_SIZE, GRID_PADDING, GRID_OFFSET_X, GRID_OFFSET_Y,
  PIECE_SCALE_SMALL, DRAG_FINGER_OFFSET_Y, TIMING, VISUAL_SETTINGS
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

    let i = 0;
    for (const cell of piece.cells) {
      const targetX = offsetX + cell.col * CELL_SIZE;
      const targetY = offsetY + cell.row * CELL_SIZE;
      
      scene.tweens.killTweensOf(container.list[i]);
      scene.tweens.add({
        targets: container.list[i],
        x: targetX,
        y: targetY,
        scaleX: 1,
        scaleY: 1,
        duration: 180,
        ease: 'Back.easeOut'
      });
      i++;
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
    container.setPosition(pointer.x, pointer.y);

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
        this.showPrediction(prediction);
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

  showPrediction(prediction) {
    const scene = this.scene;
    const cellTotal = CELL_SIZE + GRID_PADDING;

    for (const r of prediction.rows) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = GRID_OFFSET_X + c * cellTotal;
        const y = GRID_OFFSET_Y + r * cellTotal;
        const highlight = scene.add.graphics().setDepth(4);
        highlight.fillStyle(0xFFD32A, 0.25);
        highlight.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
        highlight.lineStyle(2, 0xFFD32A, 0.7);
        highlight.strokeRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
        this.predictionSprites.push(highlight);

        const tw = scene.tweens.add({
          targets: highlight, alpha: 0.3,
          duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        this.predictionTweens.push(tw);
      }
      const arrowY = GRID_OFFSET_Y + r * cellTotal + CELL_SIZE / 2;
      const arrow = scene.add.text(GRID_OFFSET_X - 18, arrowY, '▶', {
        fontSize: '14px', color: '#FFD32A'
      }).setOrigin(0.5).setDepth(4);
      this.predictionSprites.push(arrow);
      const arrowTw = scene.tweens.add({
        targets: arrow, x: GRID_OFFSET_X - 12,
        duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
      this.predictionTweens.push(arrowTw);
    }

    for (const c of prediction.cols) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const x = GRID_OFFSET_X + c * cellTotal;
        const y = GRID_OFFSET_Y + r * cellTotal;
        const highlight = scene.add.graphics().setDepth(4);
        highlight.fillStyle(0x00D2D3, 0.25);
        highlight.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
        highlight.lineStyle(2, 0x00D2D3, 0.7);
        highlight.strokeRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
        this.predictionSprites.push(highlight);

        const tw = scene.tweens.add({
          targets: highlight, alpha: 0.3,
          duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        this.predictionTweens.push(tw);
      }
      const arrowX = GRID_OFFSET_X + c * cellTotal + CELL_SIZE / 2;
      const arrow = scene.add.text(arrowX, GRID_OFFSET_Y - 16, '▼', {
        fontSize: '14px', color: '#00D2D3'
      }).setOrigin(0.5).setDepth(4);
      this.predictionSprites.push(arrow);
      const arrowTw = scene.tweens.add({
        targets: arrow, y: GRID_OFFSET_Y - 10,
        duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
      this.predictionTweens.push(arrowTw);
    }

    if (prediction.rows.length > 0 || prediction.cols.length > 0) {
      this._createShimmerWave(prediction, cellTotal);
    }
  }

  _createShimmerWave(prediction, cellTotal) {
    const scene = this.scene;
    const totalGridSize = GRID_SIZE * cellTotal - GRID_PADDING;

    for (const r of prediction.rows) {
      const shimmer = scene.add.graphics().setDepth(5).setAlpha(0.4);
      shimmer.fillStyle(0xFFFFFF, 0.6);
      shimmer.fillRect(0, 0, 20, CELL_SIZE);
      const shimmerY = GRID_OFFSET_Y + r * cellTotal;
      shimmer.setPosition(GRID_OFFSET_X - 20, shimmerY);
      this.predictionSprites.push(shimmer);
      const tw = scene.tweens.add({
        targets: shimmer, x: GRID_OFFSET_X + totalGridSize,
        duration: 600, repeat: -1, ease: 'Linear'
      });
      this.predictionTweens.push(tw);
    }

    for (const c of prediction.cols) {
      const shimmer = scene.add.graphics().setDepth(5).setAlpha(0.4);
      shimmer.fillStyle(0xFFFFFF, 0.6);
      shimmer.fillRect(0, 0, CELL_SIZE, 20);
      const shimmerX = GRID_OFFSET_X + c * cellTotal;
      shimmer.setPosition(shimmerX, GRID_OFFSET_Y - 20);
      this.predictionSprites.push(shimmer);
      const tw = scene.tweens.add({
        targets: shimmer, y: GRID_OFFSET_Y + totalGridSize,
        duration: 600, repeat: -1, ease: 'Linear'
      });
      this.predictionTweens.push(tw);
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

    let i = 0;
    for (const cell of piece.cells) {
      this.scene.tweens.killTweensOf(container.list[i]);
      this.scene.tweens.add({
        targets: container.list[i],
        x: offsetX + cell.col * cellSize,
        y: offsetY + cell.row * cellSize,
        scaleX: PIECE_SCALE_SMALL,
        scaleY: PIECE_SCALE_SMALL,
        duration: TIMING.PIECE_RETURN_DURATION,
        ease: 'Back.easeOut'
      });
      i++;
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
