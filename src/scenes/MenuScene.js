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

  // ─── BACKGROUND: Royal blue gradient matching reference ───
  renderBackground(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2B5BDE, 0x2B5BDE, 0x4A78E8, 0x4A78E8, 1);
    bg.fillRect(0, 0, W, H);
  }

  // ─── LOGO: "BLOCK BURST" matching reference composition ───
  renderLogo(W, H) {
    const row1Y = H * 0.17;
    const row2Y = H * 0.275;
    
    const logoContainer = this.add.container(0, 0).setDepth(15);

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
    const blockFontSize = 96;
    const blockSpacing = 58;
    const blockStartX = W / 2 - (blockChars.length - 1) * blockSpacing / 2;

    blockChars.forEach((ch, i) => {
      const x = blockStartX + i * blockSpacing;
      const style = blockPalette[i];

      // 3D extrusion layers
      for (let layer = 4; layer >= 1; layer--) {
        const offsetX = layer * 1.2;
        const offsetY = layer * 2.5;
        const color = layer > 2 ? style.deep : style.shadow;
        const extText = this.add.text(x + offsetX, row1Y + offsetY, ch, {
          fontSize: `${blockFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
          fontStyle: 'bold', color: color
        }).setOrigin(0.5);
        logoContainer.add(extText);
      }

      // Main face with thick stroke
      const letter = this.add.text(x, row1Y, ch, {
        fontSize: `${blockFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: 'bold', color: style.fill,
        stroke: style.stroke, strokeThickness: 6,
        shadow: { offsetX: 1, offsetY: 2, color: style.shadow, blur: 0, fill: false, stroke: true }
      }).setOrigin(0.5).setScale(0);
      logoContainer.add(letter);

      // Glossy top highlight
      const shine = this.add.text(x, row1Y - 3, ch, {
        fontSize: `${blockFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: 'bold', color: style.highlight,
        stroke: style.fill, strokeThickness: 6
      }).setOrigin(0.5).setAlpha(0.4).setScale(0);
      logoContainer.add(shine);

      this.tweens.add({
        targets: [letter, shine],
        scaleX: 1, scaleY: 1,
        duration: 350, delay: i * 60,
        ease: 'Back.easeOut'
      });
    });

    // Crown on "O" (index 2) - big, sits directly on top
    const crownX = blockStartX + 2 * blockSpacing;
    const crown = this.add.text(crownX, row1Y - 60, '👑', {
      fontSize: '52px'
    }).setOrigin(0.5).setScale(0);
    logoContainer.add(crown);

    this.tweens.add({
      targets: crown, scaleX: 1, scaleY: 1,
      duration: 400, delay: 400, ease: 'Back.easeOut'
    });
    this.tweens.add({
      targets: crown, y: crown.y - 4,
      duration: 1600, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: 900
    });

    // "BURST" - bold, bright cyan, beveled 3D style
    const dropY = row2Y;
    const dropFontSize = 62;

    // Shadow layers for BURST
    const burstBg1 = this.add.text(W / 2 + 3, dropY + 6, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#0055AA'
    }).setOrigin(0.5);
    logoContainer.add(burstBg1);

    const burstBg2 = this.add.text(W / 2 + 2, dropY + 4, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#0077CC'
    }).setOrigin(0.5);
    logoContainer.add(burstBg2);

    // Main BURST text - bright vivid cyan
    const dropText = this.add.text(W / 2, dropY, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#44EEFF',
      stroke: '#0088BB', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 2, color: '#004466', blur: 0, fill: true }
    }).setOrigin(0.5).setScale(0);
    logoContainer.add(dropText);

    // Bright highlight on BURST
    const dropShine = this.add.text(W / 2, dropY - 2, 'BURST', {
      fontSize: `${dropFontSize}px`, fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#BBFFFF',
      stroke: '#44EEFF', strokeThickness: 5
    }).setOrigin(0.5).setAlpha(0.45).setScale(0);
    logoContainer.add(dropShine);

    this.tweens.add({
      targets: [dropText, dropShine],
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

    // "ADVENTURE MASTER" subtitle
    const subY = dropY + 50;
    const subtitle = this.add.text(W / 2, subY, 'A D V E N T U R E   M A S T E R', {
      fontSize: '14px', fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: 'bold', color: '#FFFFFF',
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5).setDepth(10).setAlpha(0.85);

    this.tweens.add({
      targets: subtitle, alpha: 1,
      duration: 500, delay: 800, ease: 'Power2'
    });

    // High score
    const tempSM = new ScoreManager();
    const hs = tempSM.getHighScore();
    if (hs > 0) {
      const hsText = this.add.text(W / 2, subY + 30, `Best: ${hs.toLocaleString()}`, {
        fontSize: '17px', fontFamily: '"Fredoka", "Baloo 2", sans-serif', color: '#FFE66D'
      }).setOrigin(0.5).setDepth(10).setAlpha(0);
      this.tweens.add({ targets: hsText, alpha: 1, duration: 400, delay: 1000 });
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
    const { container: btn } = ButtonFactory.create(this, cx, cy, 260, 72, 'PLAY', '▶', 'primary', () => {
      this.scene.start('GameScene');
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
