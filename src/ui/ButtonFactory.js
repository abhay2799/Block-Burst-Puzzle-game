import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager.js';

export class ButtonFactory {
  static create(scene, x, y, w, h, label, icon, preset, callback) {
    const colors = {
      primary:   { base: 0x28A745, light: 0x34D058, dark: 0x1A6E2A },
      secondary: { base: 0x2979FF, light: 0x4D96FF, dark: 0x1A4FB0 },
      accent:    { base: 0xE65100, light: 0xFF7B54, dark: 0x993600 },
      danger:    { base: 0xD32F2F, light: 0xFF6B6B, dark: 0x8C1D1D },
    };
    const { base, light, dark } = colors[preset] || colors.primary;
    const radius = h / 2;
    const container = scene.add.container(x, y).setDepth(10);

    // 1. Drop shadow
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 8, w, h, radius);
    container.add(shadow);

    // 2. 3D Lip (Bottom Depth)
    const lip = scene.add.graphics();
    lip.fillStyle(dark, 1);
    lip.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, radius);
    container.add(lip);

    // 3. Main Face Container
    const faceContainer = scene.add.container(0, 0);
    container.add(faceContainer);

    const body = scene.add.graphics();
    body.fillStyle(base, 1);
    body.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    faceContainer.add(body);

    const borderGlow = Phaser.Display.Color.IntegerToColor(light);
    borderGlow.lighten(15);
    const border = scene.add.graphics();
    border.lineStyle(1.5, borderGlow.color, 0.6);
    border.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, radius - 1);
    faceContainer.add(border);

    const gloss = scene.add.graphics();
    gloss.fillStyle(light, 0.4);
    gloss.fillRoundedRect(-w / 2 + 4, -h / 2 + 2, w - 8, h * 0.38, { tl: radius, tr: radius, bl: 4, br: 4 });
    faceContainer.add(gloss);

    const textStr = icon ? `${icon}  ${label}` : label;
    const text = scene.add.text(0, -2, textStr, {
      fontSize: `${Math.round(h * 0.37)}px`,
      fontFamily: '"Fredoka", "Arial Rounded MT Bold", Arial',
      fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 0, fill: true }
    }).setOrigin(0.5);
    faceContainer.add(text);

    const zone = scene.add.zone(x, y, w + 10, h + 15).setDepth(11).setInteractive({ useHandCursor: true });
    
    zone.on('pointerover', () => {
      scene.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 120, ease: 'Sine.easeOut' });
    });
    
    zone.on('pointerout', () => {
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: faceContainer, y: 0, duration: 150, ease: 'Back.easeOut' });
    });
    
    zone.on('pointerdown', () => {
      if (!scene.scene.isActive()) return;
      SoundManager.uiClick();
      // Press the face down into the lip
      scene.tweens.add({
        targets: faceContainer,
        y: 6, // Move down to cover the lip
        duration: 50,
        ease: 'Quad.easeIn',
        onComplete: () => {
          scene.tweens.add({
            targets: faceContainer,
            y: 0,
            duration: 150, ease: 'Back.easeOut',
            onComplete: () => { if (callback) callback(); }
          });
        }
      });
    });

    return { container, zone };
  }
}
