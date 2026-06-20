import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';
import { ScoreManager } from '../game/ScoreManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { AdManager } from '../ads/AdManager.js';
import { ButtonFactory } from '../ui/ButtonFactory.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.events.once('shutdown', () => this.shutdown());
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    AdManager.resetAdCounters();
    AdManager.initialize().then(() => { AdManager.showBanner(); });

    SoundManager.init(this);
    SoundManager.playBGM();

    // STATE: Init
    this.renderBackground(W, H);
    this.renderLogo(W, H);

    // STATE: EntryAnimation (delayed)
    this.time.delayedCall(600, () => this.animateTumblingPiece(W, H));
  }

  // ─── BACKGROUND: High fidelity animated gradient with floating blocks ───
  renderBackground(W, H) {
    // Deep royal blue to rich cyan gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a3a9a, 0x1a3a9a, 0x4a78e8, 0x2b5bde, 1);
    bg.fillRect(0, 0, W, H);
    
    // Ambient glowing orbs
    for (let i = 0; i < 5; i++) {
      const orb = this.add.graphics();
      const color = [0x44eeff, 0xaa66ff, 0x00ffaa][i % 3];
      orb.fillStyle(color, 0.2);
      orb.fillCircle(0, 0, 80 + Math.random() * 60);
      orb.setPosition(Math.random() * W, Math.random() * H);
      
      this.tweens.add({
        targets: orb,
        x: orb.x + (Math.random() - 0.5) * 100,
        y: orb.y + (Math.random() - 0.5) * 100,
        alpha: { from: 0.2, to: 0.05 },
        duration: 4000 + Math.random() * 4000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Floating translucent background blocks
    for (let i = 0; i < 8; i++) {
      const size = 30 + Math.random() * 40;
      const x = Math.random() * W;
      const y = H + Math.random() * 200;
      // Draw centered so it rotates cleanly
      const block = this.createGlossyBlock(-size/2, -size/2, size, 0x4A78E8, 0x2B5BDE, 0x88AAFF);
      block.setPosition(x, y);
      block.setAlpha(0.2 + Math.random() * 0.3);
      block.setAngle(Math.random() * 360);
      block.setDepth(1);
      
      this.tweens.add({
        targets: block,
        y: -100,
        angle: block.angle + Phaser.Math.Between(90, 360),
        duration: 8000 + Math.random() * 10000,
        repeat: -1,
        ease: 'Linear'
      });
    }
  }

  // ─── LOGO: "BLOCK BURST" matching reference composition ───
  renderLogo(W, H) {
    const row1Y = H * 0.17;
    const row2Y = H * 0.285;
    
    const logoContainer = this.add.container(0, 0).setDepth(15);

    // Huge ambient glow behind the logo to make it pop like a high-end game
    const logoGlow = this.add.graphics();
    logoGlow.fillStyle(0xFFFFFF, 0.1);
    logoGlow.fillCircle(W / 2, (row1Y + row2Y) / 2, 150);
    logoContainer.add(logoGlow);

    // BLOCK letter palette: Yellow(B), Blue(L), Red(O), Yellow(C), Purple(K)
    const blockPalette = [
      { fill: '#FFB833', highlight: '#FFE066', stroke: '#DD8800', shadow: '#995500', deep: '#553300' },
      { fill: '#44BBFF', highlight: '#99DDFF', stroke: '#0099DD', shadow: '#005588', deep: '#003355' },
      { fill: '#EE3333', highlight: '#FF7777', stroke: '#CC1111', shadow: '#880000', deep: '#550000' },
      { fill: '#FFD000', highlight: '#FFEE55', stroke: '#CC9900', shadow: '#886600', deep: '#554400' },
      { fill: '#BB44DD', highlight: '#DD88FF', stroke: '#8822AA', shadow: '#551177', deep: '#330055' },
    ];

    // "BLOCK" - massive, tight, glossy letters
    const blockChars = ['B', 'L', 'O', 'C', 'K'];
    const blockFontSize = 100;
    const blockSpacing = 62;
    const blockStartX = W / 2 - (blockChars.length - 1) * blockSpacing / 2;

    blockChars.forEach((ch, i) => {
      const x = blockStartX + i * blockSpacing;
      const style = blockPalette[i];

      // Smooth, solid 3D extrusion using thick strokes and multiple tight layers
      for (let layer = 12; layer >= 1; layer--) {
        const offsetX = layer * 0.4;
        const offsetY = layer * 1.5;
        const color = layer > 6 ? style.deep : style.shadow;
        const extText = this.add.text(x + offsetX, row1Y + offsetY, ch, {
          fontSize: `${blockFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
          fontStyle: '900', color: color,
          stroke: color, strokeThickness: 14 // Fills gaps to make it look like a solid 3D block!
        }).setOrigin(0.5);
        logoContainer.add(extText);
      }

      // Deep outer dark rim to separate letters cleanly
      const rimLetter = this.add.text(x, row1Y, ch, {
        fontSize: `${blockFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: '900', color: style.stroke,
        stroke: style.stroke, strokeThickness: 16
      }).setOrigin(0.5).setScale(0);
      logoContainer.add(rimLetter);

      // Main vibrant face
      const letter = this.add.text(x, row1Y, ch, {
        fontSize: `${blockFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: '900', color: style.fill,
        stroke: style.stroke, strokeThickness: 2
      }).setOrigin(0.5).setScale(0);
      logoContainer.add(letter);

      // Glossy top highlight (crisp)
      const shine = this.add.text(x, row1Y - 4, ch, {
        fontSize: `${blockFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: '900', color: style.highlight,
      }).setOrigin(0.5).setAlpha(0.6).setScale(0);
      logoContainer.add(shine);

      this.tweens.add({
        targets: [rimLetter, letter, shine],
        scaleX: 1, scaleY: 1,
        duration: 350, delay: i * 60,
        ease: 'Back.easeOut'
      });
    });

    // Crown on "O" (index 2) - big, sits directly on top
    const crownX = blockStartX + 2 * blockSpacing;
    const crown = this.add.text(crownX, row1Y - 65, '👑', {
      fontSize: '56px',
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 0, fill: true, alpha: 0.3 }
    }).setOrigin(0.5).setScale(0);
    logoContainer.add(crown);

    this.tweens.add({
      targets: crown, scaleX: 1, scaleY: 1,
      duration: 400, delay: 400, ease: 'Back.easeOut'
    });
    this.tweens.add({
      targets: crown, y: crown.y - 6,
      duration: 1600, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: 900
    });

    // "BURST" - bold, bright cyan, beveled solid 3D style
    const dropY = row2Y;
    const dropFontSize = 68;

    // Solid dark navy base to anchor it
    const burstDeep = this.add.text(W / 2, dropY + 14, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#001133',
      stroke: '#001133', strokeThickness: 20
    }).setOrigin(0.5);
    logoContainer.add(burstDeep);

    // Thick mid-blue 3D shadow layer
    const burstShadow = this.add.text(W / 2, dropY + 8, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#0055AA',
      stroke: '#0055AA', strokeThickness: 16
    }).setOrigin(0.5);
    logoContainer.add(burstShadow);

    // Main BURST text - bright vivid cyan with crisp stroke
    const dropText = this.add.text(W / 2, dropY, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#66FFFF',
      stroke: '#0088DD', strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: '#00FFFF', blur: 10, fill: true, alpha: 0.5 }
    }).setOrigin(0.5).setAlpha(0).setScale(0);
    logoContainer.add(dropText);

    // Sharp white highlight for glassy premium feel
    const dropShine = this.add.text(W / 2, dropY - 2, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#FFFFFF'
    }).setOrigin(0.5).setAlpha(0).setScale(0);
    logoContainer.add(dropShine);

    this.tweens.add({
      targets: [dropText, dropShine],
      alpha: 1,
      scaleX: 1, scaleY: 1,
      duration: 350, delay: 400,
      ease: 'Back.easeOut'
    });
    
    // Smooth floating animation for the entire logo container
    this.tweens.add({
      targets: logoContainer,
      y: -12,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // "PUZZLE GAME" subtitle
    const subY = dropY + 80;
    const subtitle = this.add.text(W / 2, subY, 'P U Z Z L E   G A M E', {
      fontSize: '18px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '900', color: '#FFFFFF',
      stroke: '#003388', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 0, fill: true, alpha: 0.5 }
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: subtitle, alpha: 1,
      duration: 500, delay: 800, ease: 'Power2'
    });

    // High score pill
    const tempSM = new ScoreManager();
    const hs = tempSM.getHighScore();
    if (hs > 0) {
      const pillW = 150;
      const pillH = 46;
      const pillR = 23;
      const pillX = W / 2 - pillW / 2 + 10;
      const pillY = subY + 25;

      const bestBg = this.add.container(0, 0).setDepth(10).setAlpha(0);
      
      const highlight = this.add.graphics();
      highlight.fillStyle(0x4466AA, 0.4);
      highlight.fillRoundedRect(pillX, pillY + 2, pillW, pillH, pillR);
      bestBg.add(highlight);

      const mainBg = this.add.graphics();
      mainBg.fillStyle(0x182444, 1);
      mainBg.fillRoundedRect(pillX, pillY, pillW, pillH, pillR);
      bestBg.add(mainBg);

      const innerShadow = this.add.graphics();
      innerShadow.lineStyle(3, 0x0A1229, 0.6);
      innerShadow.strokeRoundedRect(pillX, pillY, pillW, pillH, pillR);
      bestBg.add(innerShadow);

      const trophyIcon = this.add.text(pillX + 5, pillY + pillH / 2, '🏆', {
        fontSize: '40px',
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 4, fill: true, alpha: 0.4 }
      }).setOrigin(0.5, 0.5);
      bestBg.add(trophyIcon);

      const bestScoreLabel = this.add.text(pillX + 45, pillY + pillH / 2 + 2, hs.toLocaleString(), {
        fontSize: '28px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: '900', color: '#FFB300',
        shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 0, fill: true, alpha: 0.3 }
      }).setOrigin(0, 0.5);
      bestBg.add(bestScoreLabel);

      this.tweens.add({ targets: bestBg, alpha: 1, duration: 400, delay: 1000 });
    }
  }

  // ─── STATE: EntryAnimation — Tumbling L-shape ───
  animateTumblingPiece(W, H) {
    const bs = 42;
    const cx = W / 2;
    const cy = H * 0.55;

    // L-shaped piece cells
    const lCells = [
      { r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }
    ];

    const container = this.add.container(W + 120, cy - 180).setDepth(20);
    container.setAngle(55);

    for (const cell of lCells) {
      const bx = cell.c * bs - bs * 0.5;
      const by = cell.r * bs - bs * 1.5;
      const block = this.createGlossyBlock(bx, by, bs, 0xFFCC00, 0xAA8800, 0xFFEE55);
      container.add(block);
    }

    // Tumble into center
    this.tweens.add({
      targets: container,
      x: cx, y: cy, angle: 0,
      duration: 1000,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.time.delayedCall(350, () => this.morphToSquare(container, cx, cy, bs, W, H));
      }
    });
  }

  // ─── STATE: MorphLock — L-shape → 2x2 square ───
  morphToSquare(lContainer, cx, cy, bs, W, H) {
    this.tweens.add({
      targets: lContainer,
      alpha: 0, scaleX: 0.7, scaleY: 0.7,
      duration: 200, ease: 'Power2',
      onComplete: () => {
        lContainer.destroy();

        // Build 2x2 square
        const sq = this.add.container(cx, cy).setDepth(20).setScale(0);
        const cells = [
          { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }
        ];
        for (const cell of cells) {
          const bx = cell.c * bs - bs;
          const by = cell.r * bs - bs;
          const block = this.createGlossyBlock(bx, by, bs, 0xFFCC00, 0xAA8800, 0xFFEE55);
          sq.add(block);
        }

        this.tweens.add({
          targets: sq, scaleX: 1, scaleY: 1,
          duration: 280, ease: 'Back.easeOut',
          onComplete: () => {
            this.time.delayedCall(400, () => this.transitionToPlayButton(sq, cx, cy, W, H));
          }
        });
      }
    });
  }

  // ─── STATE: PlayReady — 2x2 morphs into green PLAY button ───
  transitionToPlayButton(squareContainer, cx, cy, W, H) {
    this.tweens.add({
      targets: squareContainer,
      scaleX: 0.4, scaleY: 0.4, alpha: 0,
      duration: 250, ease: 'Power2',
      onComplete: () => {
        squareContainer.destroy();
        this.buildPlayButton(cx, cy, W, H);
      }
    });
  }

  buildPlayButton(cx, cy, W, H) {
    // Massive vibrant glow behind the play button
    const glow = this.add.graphics().setDepth(5);
    glow.fillStyle(0x5ccc00, 0.4);
    glow.fillCircle(cx, cy, 140);
    glow.setScale(0);
    
    this.tweens.add({
      targets: glow, scaleX: 1, scaleY: 1, duration: 800, ease: 'Elastic.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: glow, alpha: 0.15, scaleX: 1.15, scaleY: 1.15, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });

    const { container: btn } = ButtonFactory.create(this, cx, cy, 260, 72, 'PLAY', '▶', 'primary', () => {
      this.scene.start('GameScene', {});
    });
    
    btn.setScale(0);
    
    // Animate button in
    this.tweens.add({
      targets: btn,
      scaleX: 1, scaleY: 1,
      duration: 800, ease: 'Elastic.easeOut',
      onComplete: () => {
        // Idle pulse
        this.tweens.add({
          targets: btn,
          scaleX: 1.05, scaleY: 1.05,
          duration: 1100, yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  // ─── Helper: Glossy beveled block ───
  createGlossyBlock(x, y, size, mainColor, darkColor, lightColor) {
    const g = this.add.graphics();
    // Dark outer border
    g.fillStyle(darkColor, 1);
    g.fillRoundedRect(x, y, size, size, 5);
    // Main face
    g.fillStyle(mainColor, 1);
    g.fillRoundedRect(x + 2, y + 2, size - 4, size - 4, 4);
    // Top highlight bevel
    g.fillStyle(lightColor, 0.9);
    g.fillRoundedRect(x + 4, y + 3, size - 8, size * 0.3, { tl: 3, tr: 3, bl: 0, br: 0 });
    // Glossy specular
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(x + size * 0.3, y + size * 0.25, size * 0.1);
    // Bottom shadow
    g.fillStyle(darkColor, 0.5);
    g.fillRoundedRect(x + 4, y + size - 8, size - 8, 4, { tl: 0, tr: 0, bl: 3, br: 3 });
    return g;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
