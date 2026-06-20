import Phaser from 'phaser';

// Distinct hue sequence across the 360 degree color wheel (in 30-degree increments)
// Arranged to ensure adjacent levels have contrasting colors.
const DISTINCT_HUES = [210, 330, 150, 30, 270, 90, 300, 180, 0, 240, 60, 120];

export class VisualProgressionManager {
  constructor(scene) {
    this.scene = scene;
    this.currentStage = 0;
    this.ambientParticles = [];
    this._transitionTween = null;
  }

  update(score) { // score is actually the level passed from GameScene.js
    const newStage = this._calcStage(score);
    if (newStage !== this.currentStage || !this._initialized) {
      this._transitionTo(newStage, !this._initialized);
      this._initialized = true;
      this.currentStage = newStage;
    }
  }

  getParams() {
    return { stage: this.currentStage, ...this.getStageConfig(this.currentStage) };
  }

  getStageConfig(stageIndex) {
    const hueDeg = DISTINCT_HUES[stageIndex % DISTINCT_HUES.length];
    const baseHue = hueDeg / 360;

    // Use a rich dark-to-light gradient (dark bottom, lighter top)
    const topColor = Phaser.Display.Color.HSLToColor(baseHue, 0.8, 0.28).color;
    const bottomColor = Phaser.Display.Color.HSLToColor(baseHue, 0.9, 0.08).color;
    const accentColor = Phaser.Display.Color.HSLToColor(baseHue, 1.0, 0.65).color;
    
    // Analogous colors for particles
    const particle1 = Phaser.Display.Color.HSLToColor((baseHue + 0.08) % 1, 1.0, 0.75).color;
    const particle2 = Phaser.Display.Color.HSLToColor((baseHue + 0.92) % 1, 1.0, 0.75).color;

    return {
      name: `dynamic_hue_${hueDeg}`,
      minScore: 0,
      bgGradient: { top: topColor, bottom: bottomColor },
      borderGlowColor: accentColor,
      borderGlowIntensity: 0.5 + (stageIndex % 5) * 0.1,
      dotWaveSpeed: 1.0 + (stageIndex % 5) * 0.3,
      ambientParticleCount: 12 + (stageIndex % 10),
      ambientColors: [accentColor, particle1, particle2, 0xFFFFFF],
      uiAccentColor: accentColor,
      saturationMultiplier: 1.0
    };
  }

  _calcStage(level) {
    return Math.max(0, level - 1);
  }

  _transitionTo(newStage, isInitial) {
    const config = this.getStageConfig(newStage);

    this._animateBackground(config);
    this._updateBorderGlow(config);
    this._updateAmbientParticles(config);

    if (!isInitial) {
      this._flashTransition(config);
    }
  }

  _animateBackground(config) {
    const scene = this.scene;
    if (!scene.bgBase) return;

    scene.bgBase.clear();
    const { top, bottom } = config.bgGradient;
    scene.bgBase.fillGradientStyle(top, top, bottom, bottom, 1);
    scene.bgBase.fillRect(0, 0, scene.sys.game.config.width, scene.sys.game.config.height);
    scene.currentBgStage = this.currentStage;
  }

  _updateBorderGlow(config) {
    const scene = this.scene;
    if (!scene.gridRenderer || !scene.gridRenderer.glowDotsGfx) return;

    scene.gridRenderer._glowColor = config.borderGlowColor;
    scene.gridRenderer._glowIntensity = config.borderGlowIntensity;
    scene.gridRenderer._dotWaveSpeed = config.dotWaveSpeed;
  }

  _updateAmbientParticles(config) {
    const scene = this.scene;
    const W = scene.sys.game.config.width;
    const H = scene.sys.game.config.height;

    for (const p of this.ambientParticles) {
      if (p.tween) p.tween.destroy();
      p.gfx.destroy();
    }
    this.ambientParticles = [];

    for (let i = 0; i < config.ambientParticleCount; i++) {
      const gfx = scene.add.graphics().setDepth(-3);
      const color = config.ambientColors[i % config.ambientColors.length];
      const radius = 2 + Math.random() * 3;
      const alpha = 0.15 + Math.random() * 0.25;

      gfx.fillStyle(color, alpha);
      gfx.fillCircle(0, 0, radius);
      gfx.setPosition(Math.random() * W, Math.random() * H);

      const tween = scene.tweens.add({
        targets: gfx,
        y: gfx.y - 50 - Math.random() * 100,
        x: gfx.x + (Math.random() - 0.5) * 60,
        alpha: { from: alpha, to: alpha * 0.3 },
        duration: 6000 + Math.random() * 8000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.ambientParticles.push({ gfx, tween });
    }
  }

  _flashTransition(config) {
    const scene = this.scene;
    const flash = scene.add.graphics().setDepth(500).setAlpha(0);
    flash.fillStyle(config.borderGlowColor, 0.15);
    flash.fillRect(0, 0, scene.sys.game.config.width, scene.sys.game.config.height);

    scene.tweens.chain({
      targets: flash,
      tweens: [
        { alpha: 1, duration: 150, ease: 'Quad.easeIn' },
        { alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => flash.destroy() },
      ]
    });
  }

  shutdown() {
    for (const p of this.ambientParticles) {
      if (p.tween) p.tween.destroy();
      p.gfx.destroy();
    }
    this.ambientParticles = [];
  }
}
