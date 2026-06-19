import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager.js';

export class ButtonFactory {
  static create(scene, x, y, w, h, label, icon, preset, callback) {
    const colors = {
      primary:   { base: 0x55E066, dark: 0x229933 }, // Lime Green
      secondary: { base: 0x33BBFF, dark: 0x1177BB }, // Bright Cyan
      accent:    { base: 0xFF44AA, dark: 0xAA1155 }, // Bubblegum Pink
      danger:    { base: 0xFF5533, dark: 0xBB2211 }, // Candy Red/Orange
    };
    const { base, dark } = colors[preset] || colors.primary;
    const radius = h / 2;
    const depthOffset = 12; // Thicker 3D jelly thickness
    const container = scene.add.container(x, y).setDepth(10);

    // 1. Drop shadow (soft, wide, offset)
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + depthOffset + 8, w, h, radius);
    container.add(shadow);

    // 2. 3D Bottom Edge (static, doesn't move when pressed)
    const bottomEdge = scene.add.graphics();
    bottomEdge.fillStyle(dark, 1);
    bottomEdge.fillRoundedRect(-w / 2, -h / 2 + depthOffset, w, h, radius);
    container.add(bottomEdge);

    // 3. Main Face Container (moves up and down)
    const faceContainer = scene.add.container(0, 0);
    container.add(faceContainer);

    // 3a. Main body of the button face
    const body = scene.add.graphics();
    body.fillStyle(base, 1);
    body.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    
    // Thick jelly rim highlight
    body.lineStyle(6, 0xffffff, 0.35);
    body.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, radius - 3);
    faceContainer.add(body);

    // 3b. High-gloss curved pill highlight top half
    const gloss = scene.add.graphics();
    gloss.fillStyle(0xffffff, 0.45);
    // Extra thick rounded gloss
    gloss.fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, h * 0.35, (h * 0.35) / 2);
    faceContainer.add(gloss);

    // 3c. Text and Icon
    const textStr = icon ? `${icon} ${label}` : label;
    const text = scene.add.text(0, -4, textStr, {
      fontSize: `${Math.round(h * 0.45)}px`,
      fontFamily: '"Fredoka", "Baloo 2", sans-serif',
      fontStyle: '600', color: '#ffffff',
      stroke: dark.toString(16).replace('0x', '#'),
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 0, fill: true }
    }).setOrigin(0.5);
    faceContainer.add(text);

    // Interactive Zone
    const zone = scene.add.zone(0, 0, w + 10, h + 20 + depthOffset).setInteractive({ useHandCursor: true });
    container.add(zone);
    
    zone.on('pointerover', () => {
      scene.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 300, ease: 'Elastic.easeOut' });
    });
    
    zone.on('pointerout', () => {
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 300, ease: 'Elastic.easeOut' });
      scene.tweens.add({ targets: faceContainer, y: 0, duration: 300, ease: 'Elastic.easeOut' });
    });
    
    zone.on('pointerdown', () => {
      if (!scene.scene.isActive()) return;
      SoundManager.uiClick();
      
      // Squash animation (jelly press)
      scene.tweens.killTweensOf(faceContainer);
      scene.tweens.add({
        targets: faceContainer,
        y: depthOffset, // Squish completely down into the lip
        duration: 60,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          scene.tweens.add({
            targets: faceContainer,
            y: 0, // Pop back up
            duration: 500, ease: 'Elastic.easeOut',
            onComplete: () => { if (callback) callback(); }
          });
        }
      });
      
      // Extreme satisfying scale squash
      scene.tweens.add({
        targets: container,
        scaleX: 1.15, scaleY: 0.85,
        duration: 60, yoyo: true, ease: 'Cubic.easeOut'
      });
    });

    return { container, zone };
  }
}
