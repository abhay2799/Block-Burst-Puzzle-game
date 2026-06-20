import Phaser from 'phaser';
import { Board } from '../game/Board.js';
import { ScoreManager } from '../game/ScoreManager.js';
import { DifficultyManager } from '../game/DifficultyManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { GridRenderer } from '../managers/GridRenderer.js';
import { UIManager } from '../managers/UIManager.js';
import { AnimationManager } from '../managers/AnimationManager.js';
import { InputHandler } from '../managers/InputHandler.js';
import { VisualProgressionManager } from '../managers/VisualProgressionManager.js';
import { AdManager } from '../ads/AdManager.js';
import { ButtonFactory } from '../ui/ButtonFactory.js';
import {
  GRID_SIZE, CELL_SIZE, GRID_PADDING, GRID_OFFSET_X, GRID_OFFSET_Y,
  PIECE_SCALE_SMALL, PIECE_AREA_Y, TIMING, GAME_WIDTH, GAME_HEIGHT,
  VISUAL_SETTINGS
} from '../utils/Constants.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.initialScore = data?.score || 0;
    this.reviveData = data?.reviveData || null;
  }

  create() {
    this.board = new Board();
    this.scoreManager = new ScoreManager();
    if (this.initialScore > 0) this.scoreManager.setScore(this.initialScore);

    this.currentPieces = [null, null, null];
    this.pieceContainers = [null, null, null];
    this.isAnimating = false;
    this.isPaused = false;
    this.lastPlacedCleared = false;
    this.newHighScoreTriggered = false;
    this.turnsPlayed = 0;

    this.events.on('resume', this._onResume, this);
    this.events.once('shutdown', () => this.shutdown());

    this.gridRenderer = new GridRenderer(this);
    this.uiManager = new UIManager(this);
    this.animManager = new AnimationManager(this);
    this.inputHandler = new InputHandler(this);
    this.difficultyManager = new DifficultyManager();
    this.visualProgression = new VisualProgressionManager(this);

    this.createBackground();
    this.gridRenderer.create();
    this._createPieceTray();
    this.uiManager.create(this.scoreManager);
    this.animManager.createEmitters();

    if (VISUAL_SETTINGS.parallaxBackground) this._createParallaxShapes();

    AdManager.initialize().then(() => { AdManager.showBanner(); });

    if (this.reviveData) {
      this._revivePlayer();
    } else {
      this._checkSavedGame();
    }

    this.input.enabled = true;
    SoundManager.init(this);
    SoundManager.playBGM();

    AdManager.resetAdCounters();
    AdManager.initialize().then(() => { AdManager.showBanner(); });
  }

  _checkSavedGame() {
    try {
      const saved = localStorage.getItem('blockblast_saved_game');
      if (saved) {
        const state = JSON.parse(saved);
        this._showContinuePrompt(state);
        return;
      }
    } catch (e) { /* ignore */ }
    this.playStartAnimation();
  }

  _showContinuePrompt(state) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const overlay = this.add.graphics().setDepth(200).setAlpha(0);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 200, ease: 'Sine.easeOut' });

    const cardContainer = this.add.container(cx, cy + 60).setDepth(201).setAlpha(0);
    const cardW = 320, cardH = 220;

    const cardOuter = this.add.graphics();
    cardOuter.fillStyle(0x4477CC, 0.3);
    cardOuter.fillRoundedRect(-cardW / 2 - 4, -cardH / 2 - 4, cardW + 8, cardH + 8, 22);
    cardContainer.add(cardOuter);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1a2558, 0.95);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    cardBg.lineStyle(1.5, 0x4488CC, 0.4);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    cardContainer.add(cardBg);

    const glowLine = this.add.graphics();
    glowLine.fillStyle(0x5588FF, 0.2);
    glowLine.fillRoundedRect(-cardW / 2 + 15, -cardH / 2 + 6, cardW - 30, 3, 2);
    cardContainer.add(glowLine);

    const btnStartY = -40;
    const btnSpacing = 80;

    const cleanup = () => {
      this.tweens.add({
        targets: cardContainer, alpha: 0, y: cy - 50, duration: 200, ease: 'Quad.easeIn',
        onComplete: () => { cardContainer.destroy(true); }
      });
      this.tweens.add({
        targets: overlay, alpha: 0, duration: 200,
        onComplete: () => { overlay.destroy(); }
      });
    };

    const contBtn = ButtonFactory.create(this, 0, btnStartY, 240, 56, 'CONTINUE', '▶', 'primary', () => {
      this.tweens.add({
        targets: cardContainer, scaleX: 0.96, scaleY: 0.96,
        duration: 60, yoyo: true,
        onComplete: () => {
          cleanup();
          this.time.delayedCall(220, () => this._restoreState(state));
        }
      });
    });
    cardContainer.add(contBtn.container);

    const newBtn = ButtonFactory.create(this, 0, btnStartY + btnSpacing, 240, 56, 'NEW GAME', '✦', 'secondary', () => {
      this.tweens.add({
        targets: cardContainer, scaleX: 0.96, scaleY: 0.96,
        duration: 60, yoyo: true,
        onComplete: () => {
          cleanup();
          this.time.delayedCall(220, () => {
            try { localStorage.removeItem('blockblast_saved_game'); } catch (e) {}
            this.playStartAnimation();
          });
        }
      });
    });
    cardContainer.add(newBtn.container);

    this.tweens.add({
      targets: cardContainer,
      y: cy - 20, alpha: 1,
      duration: 400, ease: 'Back.easeOut', delay: 100
    });
  }

  playStartAnimation() {
    this.input.enabled = false;
    SoundManager.playGameStart();

    const duration = 2000;
    const blocks = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const delay = Math.random() * (duration - 400);
        this.time.delayedCall(delay, () => {
          const colorIndex = Math.floor(Math.random() * 5) + 1;
          const x = GRID_OFFSET_X + c * (CELL_SIZE + GRID_PADDING);
          const y = GRID_OFFSET_Y + r * (CELL_SIZE + GRID_PADDING);
          const sprite = this.add.image(x, y, `block_${colorIndex}`).setOrigin(0).setDepth(2).setScale(0);
          
          this.tweens.add({
            targets: sprite, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut'
          });
          blocks.push(sprite);
        });
      }
    }

    this.time.delayedCall(duration, () => {
      blocks.forEach(sprite => {
        this.tweens.add({
          targets: sprite, scaleX: 0, scaleY: 0, duration: 300, ease: 'Back.easeIn',
          onComplete: () => sprite.destroy()
        });
      });

      this.time.delayedCall(300, () => {
        this.input.enabled = true;
        this.spawnNewPieces();
        this.showTutorialIfFirstTime();
      });
    });
  }

  _revivePlayer() {
    // KILL the background Game Over explosion if it's still waiting or running!
    this.tweens.killAll();
    this.time.removeAllEvents();
    
    this.input.enabled = true;
    const state = this.reviveData.scoreManagerState;
    
    this.board.grid = this.reviveData.boardGrid;
    this.turnsPlayed = this.reviveData.turnsPlayed;
    
    this.scoreManager.score = state.score;
    this.scoreManager.combo = state.combo;
    this.scoreManager.highestCombo = state.highestCombo;
    this.scoreManager.level = state.level;
    this.scoreManager.linesClearedThisLevel = state.linesClearedThisLevel;
    this.scoreManager.totalLinesCleared = state.totalLinesCleared;
    this.scoreManager.totalBlocksPlaced = state.totalBlocksPlaced;

    this.uiManager.updateScoreDisplay(false);
    this.visualProgression.update(this.scoreManager.level);

    // Completely destroy old block sprites to prevent overlapping rendering lag!
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const oldSprite = this.gridRenderer.getBlockSprite(r, c);
        if (oldSprite) {
          oldSprite.destroy();
          this.gridRenderer.setBlockSprite(r, c, null);
        }
      }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.board.grid[r][c] !== null) {
          const colorIndex = this.board.grid[r][c];
          const x = GRID_OFFSET_X + c * (CELL_SIZE + GRID_PADDING);
          const y = GRID_OFFSET_Y + r * (CELL_SIZE + GRID_PADDING);
          const sprite = this.add.image(x, y, `block_${colorIndex}`).setOrigin(0).setDepth(2);
          this.gridRenderer.setBlockSprite(r, c, sprite);
        }
      }
    }

    this.currentPieces = this.difficultyManager.generateRevivePieces();
    const spacing = GAME_WIDTH / 3;
    for (let i = 0; i < 3; i++) {
      this.createDraggablePiece(i, spacing * i + spacing / 2, PIECE_AREA_Y);
    }
    
    SoundManager.newTurn();
    
    // Slight delay so the UI is ready
    this.time.delayedCall(500, () => {
      this.uiManager.showMotivation("REVIVED!");
    });
  }

  _restoreState(state) {
    if (!Array.isArray(state.board) || state.board.length !== GRID_SIZE) {
      this.spawnNewPieces();
      return;
    }
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!Array.isArray(state.board[r]) || state.board[r].length !== GRID_SIZE) {
        this.spawnNewPieces();
        return;
      }
    }
    this.board.grid = state.board;
    this.scoreManager.setScore(state.score ?? 0);
    this.turnsPlayed = state.turnsPlayed || 0;
    this.uiManager.updateScoreDisplay(false);
    this.visualProgression.update(this.scoreManager.level);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.board.grid[r][c] !== null) {
          const colorIndex = this.board.grid[r][c];
          const x = GRID_OFFSET_X + c * (CELL_SIZE + GRID_PADDING);
          const y = GRID_OFFSET_Y + r * (CELL_SIZE + GRID_PADDING);
          const sprite = this.add.image(x, y, `block_${colorIndex}`).setOrigin(0).setDepth(2);
          this.gridRenderer.setBlockSprite(r, c, sprite);
        }
      }
    }

    if (state.pieces) {
      this.currentPieces = state.pieces;
      const spacing = GAME_WIDTH / 3;
      for (let i = 0; i < 3; i++) {
        if (this.currentPieces[i]) {
          this.createDraggablePiece(i, spacing * i + spacing / 2, PIECE_AREA_Y);
        }
      }
    } else {
      this.spawnNewPieces();
    }
  }

  _saveGameState() {
    try {
      const state = {
        board: this.board.grid,
        pieces: this.currentPieces,
        score: this.scoreManager.getScore(),
        turnsPlayed: this.turnsPlayed
      };
      localStorage.setItem('blockblast_saved_game', JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  createBackground() {
    this.bgBase = this.add.graphics().setDepth(-10);
    this.currentBgStage = -1;
    this.visualProgression.update(this.scoreManager.level);
  }

  _createPieceTray() {
    const tray = this.add.graphics().setDepth(0);
    const trayW = GAME_WIDTH - 40;
    const trayH = 130;
    const trayX = 20;
    const trayY = PIECE_AREA_Y - 65;
    
    // Deep shadow base
    tray.fillStyle(0x050A1A, 0.6);
    tray.fillRoundedRect(trayX, trayY + 8, trayW, trayH, 24);

    // Vibrant Glass base
    tray.fillStyle(0x2B5BDE, 0.15); 
    tray.fillRoundedRect(trayX, trayY, trayW, trayH, 20);
    
    // Glowing outer stroke
    tray.lineStyle(2, 0x44AAFF, 0.5);
    tray.strokeRoundedRect(trayX, trayY, trayW, trayH, 20);

    // Sharp inner highlight
    tray.lineStyle(1, 0xFFFFFF, 0.25);
    tray.strokeRoundedRect(trayX + 2, trayY + 2, trayW - 4, trayH - 4, 18);
  }

  _createParallaxShapes() {
    // Disabled to prevent users from mistaking the background shapes for UI glitches or cursors
  }

  showTutorialIfFirstTime() {
    try {
      if (localStorage.getItem('blockblast_tutorial_done')) return;
    } catch (e) { return; }

    const hints = [
      { text: 'Drag pieces onto the grid', icon: '👆', delay: 2500 },
      { text: 'Fill a row or column to clear it!', icon: '✨', delay: 5500 }
    ];

    hints.forEach(({ text, icon, delay }) => {
      this.time.delayedCall(delay, () => {
        const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 140).setDepth(250).setAlpha(0);
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(-160, -24, 320, 48, 24);
        container.add(bg);
        const label = this.add.text(0, 0, `${icon}  ${text}`, {
          fontSize: '15px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontStyle: 'bold', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);
        container.add(label);
        this.tweens.add({ targets: container, alpha: 1, duration: 300, ease: 'Power2' });
        this.time.delayedCall(2500, () => {
          this.tweens.add({ targets: container, alpha: 0, duration: 300, onComplete: () => container.destroy(true) });
        });
      });
    });
    try { localStorage.setItem('blockblast_tutorial_done', 'true'); } catch (e) {}
  }

  spawnNewPieces() {
    for (let i = 0; i < 3; i++) {
      if (this.pieceContainers[i]) {
        this.pieceContainers[i].destroy(true);
        this.pieceContainers[i] = null;
      }
    }

    this.currentPieces = this.difficultyManager.generateSmartTurn(
      this.board, this.scoreManager.getScore(), this.turnsPlayed, this.scoreManager.getLevel()
    );
    const spacing = GAME_WIDTH / 3;

    for (let i = 0; i < 3; i++) {
      this.createDraggablePiece(i, spacing * i + spacing / 2, PIECE_AREA_Y);
    }
    SoundManager.newTurn();
  }

  createDraggablePiece(index, x, y) {
    const piece = this.currentPieces[index];
    if (!piece) return;

    const container = this.add.container(x, y).setDepth(10);
    const cellSize = CELL_SIZE * PIECE_SCALE_SMALL;
    const offsetX = -(piece.width * cellSize) / 2;
    const offsetY = -(piece.height * cellSize) / 2;

    for (const cell of piece.cells) {
      const blockX = offsetX + cell.col * cellSize;
      const blockY = offsetY + cell.row * cellSize;
      const sprite = this.add.image(blockX, blockY, `block_${piece.colorIndex}`)
        .setOrigin(0).setScale(PIECE_SCALE_SMALL);
      sprite._cellCol = cell.col; // Track exactly which cell this sprite belongs to
      sprite._cellRow = cell.row;
      container.add(sprite);
    }

    container.setSize(piece.width * cellSize + 20, piece.height * cellSize + 20);
    container.setInteractive({ draggable: true });
    container.pieceIndex = index;
    container.originalX = x;
    container.originalY = y;

    const glow = this.add.image(0, 0, 'particle').setScale(4).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    container.addAt(glow, 0);

    container.setScale(0);
    this.tweens.add({
      targets: container, scaleX: 1, scaleY: 1,
      duration: 450, ease: 'Back.easeOut', delay: index * 100,
      onStart: () => {
        this.tweens.add({
          targets: glow, alpha: 0.5, scale: 7, duration: 250, yoyo: true, onComplete: () => glow.destroy()
        });
      },
      onComplete: () => {
        container._breathTween = this.tweens.add({
          targets: container,
          scaleX: 1.02, scaleY: 1.02,
          duration: 2000, yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    this.input.setDraggable(container);
    container.on('dragstart', () => {
      if (container._breathTween) { container._breathTween.destroy(); container._breathTween = null; }
      this.inputHandler.onDragStart(container, index, this.currentPieces, this.pieceContainers);
    });
    container.on('drag', (pointer) => this.inputHandler.onDrag(container, pointer, index, this.currentPieces, this.board));
    container.on('dragend', (pointer) => {
      const result = this.inputHandler.onDragEnd(container, pointer, index, this.currentPieces, this.board, this.pieceContainers);
      if (result) this.placePiece(index, result.row, result.col);
    });

    this.pieceContainers[index] = container;
  }

  placePiece(pieceIndex, gridRow, gridCol) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    const piece = this.currentPieces[pieceIndex];

    if (this.pieceContainers[pieceIndex]) {
      this.pieceContainers[pieceIndex].destroy(true);
      this.pieceContainers[pieceIndex] = null;
    }
    this.currentPieces[pieceIndex] = null;

    const placedCells = this.board.place(piece, gridRow, gridCol);
    this.scoreManager.addPlacementPoints(piece.size);
    const shouldTriggerHS = this.uiManager.updateScoreDisplay(this.newHighScoreTriggered);
    if (shouldTriggerHS) {
      this.newHighScoreTriggered = true;
      this.uiManager.triggerNewHighScore();
      this.animManager.triggerNewHighScore();
    }
    this.visualProgression.update(this.scoreManager.level);

    for (const cell of placedCells) {
      const x = GRID_OFFSET_X + cell.col * (CELL_SIZE + GRID_PADDING);
      const y = GRID_OFFSET_Y + cell.row * (CELL_SIZE + GRID_PADDING);
      const sprite = this.add.image(x, y, `block_${cell.colorIndex}`).setOrigin(0).setDepth(2);
      sprite.setScale(0.6).setAlpha(0.7);

      this.tweens.chain({
        targets: sprite,
        tweens: [
          { scaleX: 1.15, scaleY: 0.85, alpha: 1, duration: 40, ease: 'Quad.easeOut' },
          { scaleX: 0.95, scaleY: 1.05, duration: 40, ease: 'Quad.easeInOut' },
          { scaleX: 1, scaleY: 1, duration: 60, ease: 'Back.easeOut' },
        ]
      });

      this.gridRenderer.setBlockSprite(cell.row, cell.col, sprite);
      this.animManager.emitPlaceParticles(x, y, piece.color);
    }

    SoundManager.piecePlace();
    this.gridRenderer.pulseGridBorder();

    this.time.delayedCall(TIMING.PIECE_PLACE_DURATION + 50, () => this.checkAndClearLines(placedCells));
  }

  checkAndClearLines(placedCells) {
    const clears = this.board.checkClears();
    const totalLines = this.board.getTotalLines(clears);

    if (totalLines > 0) {
      this.lastPlacedCleared = true;
      const clearedCells = this.board.clearLines(clears);
      const points = this.scoreManager.addLineClearPoints(totalLines);
      const combo = this.scoreManager.getCombo();
      const delay = this.animManager.animateLineClear(
        clearedCells, totalLines, points, clears, combo, this.gridRenderer, this.uiManager, placedCells
      );
      
      this.scoreManager.addLinesCleared(totalLines);
      if (this.scoreManager.linesClearedThisLevel >= 5) {
        const newLevel = this.scoreManager.advanceLevel();
        if (newLevel > 1 && (newLevel - 1) % 3 === 0) {
          this.uiManager.showWinningStreak();
        } else {
          this.uiManager.showMotivation(`Round ${newLevel}!`);
        }
      }

      this.time.delayedCall(delay, () => this.finishTurn());
    } else {
      this.lastPlacedCleared = false;
      this.scoreManager.addLineClearPoints(0);
      if (VISUAL_SETTINGS.settleAnimation && placedCells) {
        this.animManager.settleAnimation(placedCells, this.gridRenderer);
      }
      this.finishTurn();
    }
  }

  finishTurn() {
    const remainingPieces = this.currentPieces.filter(p => p !== null);

    if (remainingPieces.length === 0) {
      this.turnsPlayed++;
      this.time.delayedCall(200, () => {
        try {
          this.spawnNewPieces();
        } catch (e) {
          console.error('spawnNewPieces failed:', e);
        }
        this.isAnimating = false;
        this._saveGameState();
        if (!this.board.canAnyPieceFit(this.currentPieces)) {
          this.gameOver();
        }
      });
    } else {
      this.isAnimating = false;
      this._saveGameState();
      if (!this.board.canAnyPieceFit(remainingPieces)) {
        this.gameOver();
      }
    }
  }

  showPauseMenu() {
    if (this.isPaused || this.isAnimating) return;
    this.isPaused = true;
    this.scene.launch('PauseScene', { parentScene: 'GameScene', score: this.scoreManager.getScore() });
    this.scene.bringToTop('PauseScene');
    this.scene.pause();
  }

  gameOver() {
    this.isAnimating = true;
    this.scoreManager.saveHighScore();
    SoundManager.noSpace();

    try { localStorage.removeItem('blockblast_saved_game'); } catch (e) {}

    const toastY = GAME_HEIGHT / 2 - 50;
    
    const toastContainer = this.add.container(GAME_WIDTH / 2, toastY).setDepth(100).setScale(0);
    
    // Vibrant Red Badge Background
    const toastBg = this.add.graphics();
    toastBg.fillStyle(0xE62222, 0.95);
    toastBg.fillRoundedRect(-140, -35, 280, 70, 35);
    toastBg.lineStyle(4, 0xFFFFFF, 1);
    toastBg.strokeRoundedRect(-140, -35, 280, 70, 35);
    toastContainer.add(toastBg);
    
    // Bold White Text
    const toastText = this.add.text(0, 0, 'NO SPACE LEFT!', {
      fontSize: '28px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#FFFFFF',
      shadow: { offsetX: 0, offsetY: 3, color: '#660000', blur: 0, fill: true }
    }).setOrigin(0.5);
    toastContainer.add(toastText);

    // Punchy pop-in animation synced with sound
    this.tweens.chain({
      targets: toastContainer,
      tweens: [
        { scaleX: 1.1, scaleY: 1.1, duration: 500, ease: 'Back.easeOut' },
        { scaleX: 1, scaleY: 1, duration: 300, ease: 'Power2' }
      ]
    });
    
    // Give player more time to read it before exploding
    this.time.delayedCall(2500, () => {
      this.tweens.add({ targets: toastContainer, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 400, ease: 'Back.easeIn' });

      const cellTotal = CELL_SIZE + GRID_PADDING;
      const totalGridSize = GRID_SIZE * cellTotal - GRID_PADDING;
      const boardCenterX = GRID_OFFSET_X + totalGridSize / 2;
      const boardCenterY = GRID_OFFSET_Y + totalGridSize / 2;

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const sprite = this.gridRenderer.getBlockSprite(r, c);
          if (!sprite) continue;

          const sx = GRID_OFFSET_X + c * cellTotal + CELL_SIZE / 2;
          const sy = GRID_OFFSET_Y + r * cellTotal + CELL_SIZE / 2;
          const distFromCenter = Math.sqrt((sx - boardCenterX) ** 2 + (sy - boardCenterY) ** 2);
          const maxDist = totalGridSize * 0.7;
          const normalizedDist = Math.min(distFromCenter / maxDist, 1);

          // Radial delay: center blocks explode first
          const delay = normalizedDist * 300;

          // Velocity direction away from center (with randomness)
          const angle = Math.atan2(sy - boardCenterY, sx - boardCenterX);
          const spread = (1 - normalizedDist * 0.5) * Phaser.Math.Between(180, 350);
          const targetX = sprite.x + Math.cos(angle + Phaser.Math.FloatBetween(-0.4, 0.4)) * spread;
          const targetY = sprite.y + Math.sin(angle + Phaser.Math.FloatBetween(-0.3, 0.3)) * spread + 200;

          const rotationTarget = Phaser.Math.Between(-720, 720);

          this.tweens.add({
            targets: sprite,
            x: targetX,
            y: targetY,
            angle: rotationTarget,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: Phaser.Math.Between(600, 900),
            delay: delay,
            ease: 'Cubic.easeIn',
            onStart: () => {
              this.animManager.debrisEmitter.setParticleTint(0xffffff);
              this.animManager.debrisEmitter.emitParticleAt(sx, sy, 2);
            }
          });
        }
      }

      this.time.delayedCall(1400, () => {
        this._transitionToGameOver();
      });
    });
  }

  _transitionToGameOver() {
    const gameOverData = {
      score: this.scoreManager.getScore(),
      highScore: this.scoreManager.getHighScore(),
      isNewHighScore: this.newHighScoreTriggered,
      linesCleared: this.scoreManager.totalLinesCleared,
      blocksPlaced: this.scoreManager.totalBlocksPlaced,
      highestCombo: this.scoreManager.highestCombo,
      boardGrid: JSON.parse(JSON.stringify(this.board.grid)),
      turnsPlayed: this.turnsPlayed,
      scoreManagerState: {
        score: this.scoreManager.score,
        combo: this.scoreManager.combo,
        highestCombo: this.scoreManager.highestCombo,
        level: this.scoreManager.level,
        linesClearedThisLevel: this.scoreManager.linesClearedThisLevel,
        totalLinesCleared: this.scoreManager.totalLinesCleared,
        totalBlocksPlaced: this.scoreManager.totalBlocksPlaced
      }
    };

    this.cameras.main.fade(400, 0, 0, 0, false, (cam, progress) => {
      if (progress >= 1) {
        this.scene.start('GameOverScene', gameOverData);
      }
    });
  }

  _onResume() {
    this.isPaused = false;
  }

  shutdown() {
    this.events.off('resume', this._onResume, this);
    this.inputHandler.shutdown();
    this.gridRenderer.shutdown();
    this.uiManager.shutdown();
    this.animManager.shutdown();
    this.visualProgression.shutdown();
  }
}
