const STAGES = [
  {
    name: 'deep_ocean',
    minScore: 0,
    bgGradient: { top: 0x1A2744, bottom: 0x0D1B2A },
    borderGlowColor: 0x88CCFF,
    borderGlowIntensity: 0.5,
    dotWaveSpeed: 1.0,
    ambientParticleCount: 3,
    ambientColors: [0x4488FF, 0x00FFAA],
    uiAccentColor: 0x88CCFF,
    saturationMultiplier: 0.8,
  },
  {
    name: 'nebula',
    minScore: 500,
    bgGradient: { top: 0x1E3050, bottom: 0x12223A },
    borderGlowColor: 0x44AAFF,
    borderGlowIntensity: 0.45,
    dotWaveSpeed: 1.4,
    ambientParticleCount: 6,
    ambientColors: [0x44AAFF, 0x8866FF, 0x00CCFF],
    uiAccentColor: 0x44AAFF,
    saturationMultiplier: 0.9,
  },
  {
    name: 'aurora',
    minScore: 1500,
    bgGradient: { top: 0x232B52, bottom: 0x161C40 },
    borderGlowColor: 0xAA66FF,
    borderGlowIntensity: 0.6,
    dotWaveSpeed: 1.8,
    ambientParticleCount: 9,
    ambientColors: [0xAA66FF, 0xFF66AA, 0x6644FF],
    uiAccentColor: 0xAA66FF,
    saturationMultiplier: 1.0,
  },
  {
    name: 'supernova',
    minScore: 3000,
    bgGradient: { top: 0x2A1E4A, bottom: 0x150E2A },
    borderGlowColor: 0xFF6644,
    borderGlowIntensity: 0.8,
    dotWaveSpeed: 2.3,
    ambientParticleCount: 12,
    ambientColors: [0xFF6644, 0xFFAA00, 0xFF4488],
    uiAccentColor: 0xFF6644,
    saturationMultiplier: 1.15,
  },
  {
    name: 'void',
    minScore: 5000,
    bgGradient: { top: 0x321A3E, bottom: 0x1A0C22 },
    borderGlowColor: 0xFFDD00,
    borderGlowIntensity: 1.0,
    dotWaveSpeed: 3.0,
    ambientParticleCount: 15,
    ambientColors: [0xFFDD00, 0xFFFFFF, 0xFF44FF, 0xFF6600],
    uiAccentColor: 0xFFDD00,
    saturationMultiplier: 1.3,
  },
];

export class VisualProgressionManager {
  constructor(scene) {
    this.scene = scene;
    this.currentStage = 0;
    this.ambientParticles = [];
    this._transitionTween = null;
  }

  update(score) {
    const newStage = this._calcStage(score);
    if (newStage !== this.currentStage || !this._initialized) {
      this._transitionTo(newStage, !this._initialized);
      this._initialized = true;
      this.currentStage = newStage;
    }
  }

  getParams() {
    return { stage: this.currentStage, ...STAGES[this.currentStage] };
  }

  getStageConfig(stageIndex) {
    return STAGES[stageIndex] || STAGES[0];
  }

  _calcStage(score) {
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (score >= STAGES[i].minScore) return i;
    }
    return 0;
  }

  _transitionTo(newStage, isInitial) {
    const scene = this.scene;
    const config = STAGES[newStage];

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
