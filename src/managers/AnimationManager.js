import Phaser from 'phaser';
import {
  GRID_SIZE, CELL_SIZE, GRID_PADDING, GRID_OFFSET_X, GRID_OFFSET_Y,
  GAME_WIDTH, GAME_HEIGHT, TIMING, COLORS, VISUAL_SETTINGS
} from '../utils/Constants.js';
import { HapticManager } from './HapticManager.js';
import { SoundManager } from '../audio/SoundManager.js';

export class AnimationManager {
  constructor(scene) {
    this.scene = scene;
    this.comboStreakEmitter = null;
  }

  createEmitters() {
    const scene = this.scene;

    this.clearEmitter = scene.add.particles(0, 0, 'particle', {
      speed: { min: 120, max: 350 },
      scale: { start: 1.2, end: 0 },
      lifespan: { min: 500, max: 900 },
      gravityY: 400, emitting: false, quantity: 8,
      angle: { min: 180, max: 360 }
    }).setDepth(15);

    this.starEmitter = scene.add.particles(0, 0, 'particle_star', {
      speed: { min: 60, max: 180 },
      scale: { start: 1, end: 0 },
      lifespan: { min: 400, max: 800 },
      gravityY: 100, emitting: false, quantity: 3,
      rotate: { min: 0, max: 360 }, angle: { min: 0, max: 360 }
    }).setDepth(16);

    this.debrisEmitter = scene.add.particles(0, 0, 'particle_debris', {
      speed: { min: 150, max: 400 },
      scale: { start: 1, end: 0.3 },
      lifespan: { min: 600, max: 1000 },
      gravityY: 600, emitting: false, quantity: 5,
      rotate: { min: 0, max: 720 }, angle: { min: 220, max: 320 }
    }).setDepth(15);

    this.placeEmitter = scene.add.particles(0, 0, 'particle_star', {
      speed: { min: 40, max: 100 },
      scale: { start: 0.7, end: 0 },
      lifespan: 350, emitting: false, quantity: 3,
      angle: { min: 0, max: 360 }
    }).setDepth(15);

    this.ringEmitter = scene.add.particles(0, 0, 'particle_ring', {
      speed: { min: 0, max: 20 },
      scale: { start: 0.3, end: 2.5 },
      alpha: { start: 1, end: 0 },
      lifespan: 600, emitting: false, quantity: 1
    }).setDepth(17);

    this.hollowEmitter = scene.add.particles(0, 0, 'hollow_square', {
      speed: { min: 150, max: 500 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 900 },
      gravityY: 200, emitting: false, quantity: 8,
      rotate: { min: -360, max: 360 }, angle: { min: 0, max: 360 }
    }).setDepth(16);
  }

  emitPlaceParticles(x, y, color) {
    this.placeEmitter.setParticleTint(color);
    this.placeEmitter.emitParticleAt(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 2);
  }

  animateLineClear(clearedCells, lineCount, points, clears, combo, gridRenderer, uiManager, placedCells) {
    const scene = this.scene;
    const cellTotal = CELL_SIZE + GRID_PADDING;
    const totalGridSize = GRID_SIZE * cellTotal - GRID_PADDING;

    // LASER SWEEP EFFECT
    if (VISUAL_SETTINGS.laserSweep && clears) {
      for (const r of clears.rows) {
        const laserY = GRID_OFFSET_Y + r * cellTotal + CELL_SIZE / 2;
        const laser = scene.add.graphics().setDepth(13);
        laser.fillStyle(0x00ff88, 1);
        laser.fillRect(0, -2, totalGridSize, 4);
        laser.setPosition(GRID_OFFSET_X, laserY);
        laser.setAlpha(0).setScale(0, 1);
        scene.tweens.add({
          targets: laser, scaleX: 1, alpha: 1,
          duration: 200, ease: 'Cubic.easeOut',
          onComplete: () => {
            scene.tweens.add({ targets: laser, alpha: 0, duration: 200, onComplete: () => laser.destroy() });
          }
        });
      }
      for (const c of clears.cols) {
        const laserX = GRID_OFFSET_X + c * cellTotal + CELL_SIZE / 2;
        const laser = scene.add.graphics().setDepth(13);
        laser.fillStyle(0x00ff88, 1);
        laser.fillRect(-2, 0, 4, totalGridSize);
        laser.setPosition(laserX, GRID_OFFSET_Y);
        laser.setAlpha(0).setScale(1, 0);
        scene.tweens.add({
          targets: laser, scaleY: 1, alpha: 1,
          duration: 200, ease: 'Cubic.easeOut',
          onComplete: () => {
            scene.tweens.add({ targets: laser, alpha: 0, duration: 200, onComplete: () => laser.destroy() });
          }
        });
      }
    }

    // SHOCKWAVE RING from center of each cleared line
    if (VISUAL_SETTINGS.shockwaveRing && lineCount >= 1) {
      const centers = [];
      if (clears) {
        for (const r of clears.rows) {
          centers.push({ x: GRID_OFFSET_X + totalGridSize / 2, y: GRID_OFFSET_Y + r * cellTotal + CELL_SIZE / 2 });
        }
        for (const c of clears.cols) {
          centers.push({ x: GRID_OFFSET_X + c * cellTotal + CELL_SIZE / 2, y: GRID_OFFSET_Y + totalGridSize / 2 });
        }
      }
      for (const center of centers) {
        const ring = scene.add.graphics().setDepth(14);
        ring.lineStyle(3, 0x00FFAA, 1);
        ring.strokeCircle(0, 0, 10);
        ring.setPosition(center.x, center.y);
        scene.tweens.add({
          targets: ring, scaleX: 8, scaleY: 8, alpha: 0,
          duration: 500, ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy()
        });
      }
    }

    // FLASH PULSE for multi-line clears
    if (VISUAL_SETTINGS.flashPulse && lineCount >= 2) {
      const flashAlpha = Math.min(0.15 + lineCount * 0.08, 0.5);
      uiManager.screenFlash.setAlpha(flashAlpha);
      scene.tweens.add({ targets: uiManager.screenFlash, alpha: 0, duration: 300, ease: 'Power2' });

      // Chromatic aberration-like camera offset
      scene.cameras.main.x = -2;
      scene.time.delayedCall(50, () => { scene.cameras.main.x = 2; });
      scene.time.delayedCall(100, () => { scene.cameras.main.x = 0; });
    } else if (lineCount === 1) {
      uiManager.screenFlash.setAlpha(0.1);
      scene.tweens.add({ targets: uiManager.screenFlash, alpha: 0, duration: 200 });
    }

    // SLOW MOTION for 3+ line clears
    if (VISUAL_SETTINGS.slowMotion && lineCount >= 3) {
      scene.time.timeScale = 0.5;
      const restoreSpeed = () => {
        if (scene && scene.time) scene.time.timeScale = 1;
      };
      scene.time.delayedCall(600, restoreSpeed);
    }

    // COMBO STREAK PARTICLES
    if (VISUAL_SETTINGS.comboStreakParticles && combo > 2) {
      this.starEmitter.setParticleTint(0xFFD700);
      for (let i = 0; i < 5; i++) {
        scene.time.delayedCall(i * 80, () => {
          this.starEmitter.emitParticleAt(
            Phaser.Math.Between(GRID_OFFSET_X, GRID_OFFSET_X + totalGridSize),
            GRID_OFFSET_Y - 20, 2
          );
        });
      }
    }

    // NEON GLOW BOUNDING BOXES
    const glowColor = clearedCells.length > 0 ? COLORS[clearedCells[0].colorIndex] : 0xFF3366;
    
    if (clears) {
      for (const r of clears.rows) {
        const y = GRID_OFFSET_Y + r * cellTotal;
        const rect = scene.add.graphics().setDepth(18);
        rect.lineStyle(6, glowColor, 1);
        rect.strokeRect(GRID_OFFSET_X, y, totalGridSize, CELL_SIZE);
        rect.setAlpha(0);
        
        scene.tweens.add({
          targets: rect, alpha: 1, scaleX: 1.02, scaleY: 1.05, duration: 150, yoyo: true, hold: 200,
          onComplete: () => rect.destroy()
        });

        // Emit hollow squares along the row
        this.hollowEmitter.setParticleTint(glowColor);
        for(let c = 0; c < GRID_SIZE; c++) {
           this.hollowEmitter.emitParticleAt(GRID_OFFSET_X + c * cellTotal + CELL_SIZE/2, y + CELL_SIZE/2, 2);
        }
      }
      for (const c of clears.cols) {
        const x = GRID_OFFSET_X + c * cellTotal;
        const rect = scene.add.graphics().setDepth(18);
        rect.lineStyle(6, glowColor, 1);
        rect.strokeRect(x, GRID_OFFSET_Y, CELL_SIZE, totalGridSize);
        rect.setAlpha(0);
        
        scene.tweens.add({
          targets: rect, alpha: 1, scaleX: 1.05, scaleY: 1.02, duration: 150, yoyo: true, hold: 200,
          onComplete: () => rect.destroy()
        });

        // Emit hollow squares along the col
        this.hollowEmitter.setParticleTint(glowColor);
        for(let r = 0; r < GRID_SIZE; r++) {
           this.hollowEmitter.emitParticleAt(x + CELL_SIZE/2, GRID_OFFSET_Y + r * cellTotal + CELL_SIZE/2, 2);
        }
      }
    }

    // Sound
    SoundManager.handleClearSound(lineCount, combo, clears);

    // PHASE 2: Shrink blocks
    scene.time.delayedCall(100, () => {
      // Ring burst for big clears
      if (lineCount >= 2) {
        const centerX = GRID_OFFSET_X + 4 * cellTotal;
        const centerY = GRID_OFFSET_Y + 4 * cellTotal;
        this.ringEmitter.setParticleTint(glowColor);
        this.ringEmitter.emitParticleAt(centerX, centerY, 1);
      }

      for (const cell of clearedCells) {
        const blockSprite = gridRenderer.getBlockSprite(cell.row, cell.col);
        if (blockSprite) {
          if (blockSprite.setTintFill) {
            blockSprite.setTintFill(0xffffff);
          } else {
            blockSprite.setTint(0xffffff);
          }
          
          scene.tweens.add({
            targets: blockSprite,
            scaleX: 1.3, scaleY: 1.3,
            duration: 80,
            yoyo: true,
            onComplete: () => {
              scene.tweens.add({
                targets: blockSprite,
                scaleX: 0, scaleY: 0, alpha: 0,
                angle: Phaser.Math.Between(-90, 90),
                duration: TIMING.SHRINK_DURATION - 50,
                ease: 'Back.easeIn',
                onComplete: () => blockSprite.destroy()
              });
            }
          });
          gridRenderer.clearBlockSprite(cell.row, cell.col);
        }
      }

      // IMPACT WOBBLE on adjacent blocks
      if (VISUAL_SETTINGS.impactWobble) {
        this._applyImpactWobble(clears, gridRenderer);
      }

      // EDGE GLOW
      if (VISUAL_SETTINGS.edgeGlow && clearedCells.length > 0) {
        this._flashEdgeGlow(glowColor);
      }

      // Screen shake (Huge impact for combos)
      const intensity = Math.min(lineCount * 8 + combo * 5, 40);
      scene.cameras.main.shake(TIMING.SHAKE_DURATION + 100, intensity / 1000);

      uiManager.showScorePopup(points, clearedCells, combo);
      if (combo >= 1) { uiManager.showComboText(combo, placedCells, glowColor); }
      uiManager.updateScoreDisplay(scene.newHighScoreTriggered);
    });

    return TIMING.FLASH_DURATION + TIMING.SHRINK_DURATION + 150;
  }

  _applyImpactWobble(clears, gridRenderer) {
    if (!clears) return;
    const scene = this.scene;
    const affected = new Set();

    for (const r of clears.rows) {
      if (r > 0) affected.add(`${r - 1}`);
      if (r < GRID_SIZE - 1) affected.add(`${r + 1}`);
    }
    for (const c of clears.cols) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const sprite = gridRenderer.getBlockSprite(r, c > 0 ? c - 1 : c);
        if (sprite && !affected.has(`sprite_${r}_${c - 1}`)) {
          affected.add(`sprite_${r}_${c - 1}`);
        }
      }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const sprite = gridRenderer.getBlockSprite(r, c);
        if (!sprite) continue;
        let isAdjacent = false;
        for (const row of (clears.rows || [])) {
          if (Math.abs(r - row) === 1) { isAdjacent = true; break; }
        }
        if (!isAdjacent) {
          for (const col of (clears.cols || [])) {
            if (Math.abs(c - col) === 1) { isAdjacent = true; break; }
          }
        }
        if (isAdjacent) {
          const origX = sprite.x;
          scene.tweens.add({
            targets: sprite, x: origX + 2,
            duration: 25, yoyo: true, repeat: 2,
            onComplete: () => sprite.setX(origX)
          });
        }
      }
    }
  }

  _flashEdgeGlow(color) {
    const scene = this.scene;
    const edges = [
      { x: 0, y: 0, w: 4, h: GAME_HEIGHT },
      { x: GAME_WIDTH - 4, y: 0, w: 4, h: GAME_HEIGHT },
      { x: 0, y: 0, w: GAME_WIDTH, h: 4 },
      { x: 0, y: GAME_HEIGHT - 4, w: GAME_WIDTH, h: 4 },
    ];
    for (const e of edges) {
      const gfx = scene.add.graphics().setDepth(60).setAlpha(0.7);
      gfx.fillStyle(color, 1);
      gfx.fillRect(e.x, e.y, e.w, e.h);
      scene.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });
    }
  }

  triggerNewHighScore() {
    const scene = this.scene;

    const flash = scene.add.graphics().setDepth(100);
    flash.fillStyle(0xFFD700, 0.3);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.destroy() });

    this.starEmitter.setParticleTint(0xFFD700);
    this.starEmitter.emitParticleAt(GAME_WIDTH / 2, GAME_HEIGHT / 2, 20);
    this.clearEmitter.setParticleTint(0xFFD700);
    this.clearEmitter.emitParticleAt(GAME_WIDTH / 2, GAME_HEIGHT / 2, 15);

    HapticManager.combo();
  }

  settleAnimation(placedCells, gridRenderer) {
    if (!VISUAL_SETTINGS.settleAnimation) return;
    const scene = this.scene;
    for (const cell of placedCells) {
      const sprite = gridRenderer.getBlockSprite(cell.row, cell.col);
      if (sprite) {
        const cellTotal = CELL_SIZE + GRID_PADDING;
        const cx = GRID_OFFSET_X + cell.col * cellTotal + CELL_SIZE / 2;
        const cy = GRID_OFFSET_Y + cell.row * cellTotal + CELL_SIZE;

        scene.tweens.chain({
          targets: sprite,
          tweens: [
            { scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Sine.easeOut' },
            {
              scaleX: 1, scaleY: 1, duration: 80, ease: 'Sine.easeIn',
              onComplete: () => {
                this.placeEmitter.setParticleTint(0xcccccc);
                this.placeEmitter.emitParticleAt(cx, cy, 2);
              }
            }
          ]
        });
      }
    }
  }

  shutdown() {
    if (this.clearEmitter) { this.clearEmitter.destroy(); this.clearEmitter = null; }
    if (this.starEmitter) { this.starEmitter.destroy(); this.starEmitter = null; }
    if (this.debrisEmitter) { this.debrisEmitter.destroy(); this.debrisEmitter = null; }
    if (this.placeEmitter) { this.placeEmitter.destroy(); this.placeEmitter = null; }
    if (this.ringEmitter) { this.ringEmitter.destroy(); this.ringEmitter = null; }
  }
}
