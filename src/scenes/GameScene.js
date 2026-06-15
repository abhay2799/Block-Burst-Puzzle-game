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

    this._checkSavedGame();

    this.input.enabled = true;

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
    this.spawnNewPieces();
    this.showTutorialIfFirstTime();
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
    const cardW = 320, cardH = 280;

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

    const iconBg = this.add.graphics();
    iconBg.fillStyle(0x2B7AFF, 0.15);
    iconBg.fillCircle(0, -cardH / 2 + 55, 28);
    iconBg.lineStyle(2, 0x2B7AFF, 0.4);
    iconBg.strokeCircle(0, -cardH / 2 + 55, 28);
    cardContainer.add(iconBg);

    const icon = this.add.text(0, -cardH / 2 + 55, '💾', { fontSize: '28px' }).setOrigin(0.5);
    cardContainer.add(icon);

    const titleText = this.add.text(0, -cardH / 2 + 100, 'Saved Game Found', {
      fontSize: '22px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5);
    cardContainer.add(titleText);

    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x0F1838, 0.6);
    scoreBg.fillRoundedRect(-80, -cardH / 2 + 120, 160, 36, 18);
    cardContainer.add(scoreBg);

    const scoreText = this.add.text(0, -cardH / 2 + 138, `⭐  ${(state.score ?? 0).toLocaleString()}  points`, {
      fontSize: '15px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#FFD93D'
    }).setOrigin(0.5);
    cardContainer.add(scoreText);

    const btnW = 240, btnH = 52;
    const continueBtnY = 10;

    const contShadow = this.add.graphics();
    contShadow.fillStyle(0x000000, 0.2);
    contShadow.fillRoundedRect(-btnW / 2 + 2, continueBtnY - btnH / 2 + 4, btnW, btnH, btnH / 2);
    cardContainer.add(contShadow);

    const contBody = this.add.graphics();
    contBody.fillStyle(0x28A745, 1);
    contBody.fillRoundedRect(-btnW / 2, continueBtnY - btnH / 2, btnW, btnH, btnH / 2);
    cardContainer.add(contBody);

    const contGloss = this.add.graphics();
    contGloss.fillStyle(0x34D058, 0.4);
    contGloss.fillRoundedRect(-btnW / 2 + 4, continueBtnY - btnH / 2 + 2, btnW - 8, btnH * 0.38, { tl: btnH / 2, tr: btnH / 2, bl: 4, br: 4 });
    cardContainer.add(contGloss);

    const contText = this.add.text(0, continueBtnY, '▶  CONTINUE', {
      fontSize: '18px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 0, fill: true }
    }).setOrigin(0.5);
    cardContainer.add(contText);

    const newBtnY = 74;

    const newShadow = this.add.graphics();
    newShadow.fillStyle(0x000000, 0.2);
    newShadow.fillRoundedRect(-btnW / 2 + 2, newBtnY - btnH / 2 + 4, btnW, btnH, btnH / 2);
    cardContainer.add(newShadow);

    const newBody = this.add.graphics();
    newBody.fillStyle(0x2979FF, 1);
    newBody.fillRoundedRect(-btnW / 2, newBtnY - btnH / 2, btnW, btnH, btnH / 2);
    cardContainer.add(newBody);

    const newGloss = this.add.graphics();
    newGloss.fillStyle(0x4D96FF, 0.4);
    newGloss.fillRoundedRect(-btnW / 2 + 4, newBtnY - btnH / 2 + 2, btnW - 8, btnH * 0.38, { tl: btnH / 2, tr: btnH / 2, bl: 4, br: 4 });
    cardContainer.add(newGloss);

    const newText = this.add.text(0, newBtnY, '✦  NEW GAME', {
      fontSize: '18px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 0, fill: true }
    }).setOrigin(0.5);
    cardContainer.add(newText);

    this.tweens.add({
      targets: cardContainer,
      y: cy, alpha: 1,
      duration: 400, ease: 'Back.easeOut', delay: 100,
      onComplete: () => {
        const contZone = this.add.zone(cx, cy + continueBtnY, btnW, btnH).setDepth(203).setInteractive({ useHandCursor: true });
        const newZone = this.add.zone(cx, cy + newBtnY, btnW, btnH).setDepth(203).setInteractive({ useHandCursor: true });

        const cleanup = () => {
          this.tweens.add({
            targets: cardContainer, alpha: 0, y: cy - 30, duration: 200, ease: 'Quad.easeIn',
            onComplete: () => { cardContainer.destroy(true); }
          });
          this.tweens.add({
            targets: overlay, alpha: 0, duration: 200,
            onComplete: () => { overlay.destroy(); }
          });
          contZone.destroy();
          newZone.destroy();
        };

        contZone.on('pointerdown', () => {
          SoundManager.uiClick();
          this.tweens.add({
            targets: cardContainer, scaleX: 0.96, scaleY: 0.96,
            duration: 60, yoyo: true,
            onComplete: () => { cleanup(); this.time.delayedCall(220, () => this._restoreState(state)); }
          });
        });

        newZone.on('pointerdown', () => {
          SoundManager.uiClick();
          this.tweens.add({
            targets: cardContainer, scaleX: 0.96, scaleY: 0.96,
            duration: 60, yoyo: true,
            onComplete: () => {
              cleanup();
              this.time.delayedCall(220, () => {
                try { localStorage.removeItem('blockblast_saved_game'); } catch (e) {}
                this.spawnNewPieces();
                this.showTutorialIfFirstTime();
              });
            }
          });
        });
      }
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
    this.visualProgression.update(state.score ?? 0);

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
    this.visualProgression.update(0);
  }

  _createPieceTray() {
    const tray = this.add.graphics().setDepth(0);
    const trayW = GAME_WIDTH - 40;
    const trayH = 130;
    const trayX = 20;
    const trayY = PIECE_AREA_Y - 65;
    tray.fillStyle(0x0F1838, 0.5);
    tray.fillRoundedRect(trayX, trayY, trayW, trayH, 16);
    tray.lineStyle(1, 0x3355AA, 0.2);
    tray.strokeRoundedRect(trayX, trayY, trayW, trayH, 16);
  }

  _createParallaxShapes() {
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics().setDepth(-5).setAlpha(Phaser.Math.FloatBetween(0.03, 0.08));
      const size = Phaser.Math.Between(20, 60);
      g.fillStyle(0xffffff, 1);
      if (i % 3 === 0) {
        g.fillTriangle(size / 2, 0, 0, size, size, size);
      } else if (i % 3 === 1) {
        g.fillRect(0, 0, size, size);
      } else {
        g.fillCircle(size / 2, size / 2, size / 2);
      }
      g.setPosition(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT));

      this.tweens.add({
        targets: g,
        y: g.y - Phaser.Math.Between(40, 120),
        x: g.x + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(8000, 15000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
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
          fontSize: '15px', fontFamily: '"Fredoka", sans-serif', fontStyle: 'bold', color: '#ffffff', align: 'center'
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
      this.board, this.scoreManager.getScore(), this.turnsPlayed
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
      container.add(sprite);
    }

    container.setSize(piece.width * cellSize + 20, piece.height * cellSize + 20);
    container.setInteractive({ draggable: true, useHandCursor: true });
    container.pieceIndex = index;
    container.originalX = x;
    container.originalY = y;

    container.setScale(0);
    this.tweens.add({
      targets: container, scaleX: 1, scaleY: 1,
      duration: 450, ease: 'Back.easeOut', delay: index * 100,
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
    this.visualProgression.update(this.scoreManager.getScore());

    for (const cell of placedCells) {
      const x = GRID_OFFSET_X + cell.col * (CELL_SIZE + GRID_PADDING);
      const y = GRID_OFFSET_Y + cell.row * (CELL_SIZE + GRID_PADDING);
      const sprite = this.add.image(x, y, `block_${cell.colorIndex}`).setOrigin(0).setDepth(2);
      sprite.setScale(0.6).setAlpha(0.7);

      this.tweens.chain({
        targets: sprite,
        tweens: [
          { scaleX: 1.12, scaleY: 0.88, alpha: 1, duration: 80, ease: 'Quad.easeOut' },
          { scaleX: 0.94, scaleY: 1.06, duration: 60, ease: 'Quad.easeInOut' },
          { scaleX: 1, scaleY: 1, duration: 100, ease: 'Back.easeOut' },
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
        clearedCells, totalLines, points, clears, combo, this.gridRenderer, this.uiManager
      );
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
    SoundManager.gameOver();

    try { localStorage.removeItem('blockblast_saved_game'); } catch (e) {}

    const toastY = PIECE_AREA_Y + 10;
    const toastBg = this.add.graphics().setDepth(100);
    toastBg.fillStyle(0x1a1a3e, 0.85);
    toastBg.fillRoundedRect(GAME_WIDTH / 2 - 120, toastY - 18, 240, 36, 18);
    const toastText = this.add.text(GAME_WIDTH / 2, toastY, 'No Space Left', {
      fontSize: '15px', fontFamily: '"Fredoka", sans-serif',
      fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setDepth(101);

    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: [toastBg, toastText], alpha: 0, duration: 300 });

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
      isNewHighScore: this.newHighScoreTriggered
    };

    if (AdManager.shouldShowGameOverAd()) {
      AdManager.showInterstitial(this, () => {
        this.scene.start('GameOverScene', gameOverData);
      });
    } else {
      this.cameras.main.fade(400, 0, 0, 0, false, (cam, progress) => {
        if (progress >= 1) {
          this.scene.start('GameOverScene', gameOverData);
        }
      });
    }
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
