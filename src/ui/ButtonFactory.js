import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager.js';

export class ButtonFactory {
  static create(scene, x, y, w, h, label, icon, preset, callback) {
    const colors = {
      primary:   { base: 0x44DD00, dark: 0x228800 }, // Bright Green
      secondary: { base: 0x1199FF, dark: 0x0055AA }, // Bright Blue
      tertiary:  { base: 0x9933FF, dark: 0x5511AA }, // Bright Purple
      warning:   { base: 0xffb300, dark: 0xcc8f00 }, // Golden Yellow
      accent:    { base: 0xFF44AA, dark: 0xAA1155 }, // Bubblegum Pink
      danger:    { base: 0xFF5533, dark: 0xBB2211 }, // Candy Red/Orange
    };
    const { base, dark } = colors[preset] || colors.primary;
    const radius = h * 0.25; // Pill-like rounded corners
    const depthOffset = 10; // Deep 3D bottom
    const container = scene.add.container(x, y).setDepth(10);

    // 1. Drop shadow
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillRoundedRect(-w / 2, -h / 2 + depthOffset + 2, w, h, radius);
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
    faceContainer.add(body);

    // 3b. Exact Top-edge Gloss highlight from the image
    const gloss = scene.add.graphics();
    gloss.fillStyle(0xffffff, 0.35);
    // Draw a pill-shaped highlight along the top edge
    gloss.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.2, (h * 0.2) / 2);
    faceContainer.add(gloss);

    // 3c. Icon and Text separated
    if (icon) {
      // Icon on far left
      const iconTxt = scene.add.text(-w / 2 + 35, -4, icon, {
        fontSize: `${Math.round(h * 0.55)}px`, color: '#ffffff',
        stroke: dark, strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 0, fill: true, alpha: 0.3 }
      }).setOrigin(0.5);
      faceContainer.add(iconTxt);
      
      // Text centered in the remaining space
      const text = scene.add.text(15, -4, label, {
        fontSize: `${Math.round(h * 0.4)}px`,
        fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: '800', color: '#ffffff',
        stroke: dark, strokeThickness: 4,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 0, fill: true, alpha: 0.4 }
      }).setOrigin(0.5);
      faceContainer.add(text);
    } else {
      const text = scene.add.text(0, -4, label, {
        fontSize: `${Math.round(h * 0.45)}px`,
        fontFamily: '"Fredoka", "Baloo 2", sans-serif',
        fontStyle: '800', color: '#ffffff',
        stroke: dark, strokeThickness: 4,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 0, fill: true, alpha: 0.4 }
      }).setOrigin(0.5);
      faceContainer.add(text);
    }

    // Interactive Area directly on the container
    const hitArea = new Phaser.Geom.Rectangle(-w/2 - 5, -h/2 - 10, w + 10, h + 20 + depthOffset);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    
    let isPressed = false;

    container.on('pointerover', () => {
      if (isPressed) return;
      scene.tweens.killTweensOf(container);
      scene.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Quad.easeOut' });
    });
    
    container.on('pointerout', () => {
      if (!isPressed) {
        scene.tweens.killTweensOf(container);
        scene.tweens.killTweensOf(faceContainer);
        scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
        scene.tweens.add({ targets: faceContainer, y: 0, duration: 150, ease: 'Quad.easeOut' });
      }
    });
    
    container.on('pointerdown', () => {
      isPressed = true;
      SoundManager.uiClick();
      
      scene.tweens.killTweensOf(faceContainer);
      scene.tweens.add({
        targets: faceContainer,
        y: depthOffset, // Press down
        duration: 80,
        ease: 'Quad.easeOut'
      });
      
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        scaleX: 0.95, scaleY: 0.95, // Snappy uniform shrink
        duration: 80, ease: 'Quad.easeOut'
      });
    });

    container.on('pointerup', () => {
      if (!isPressed) return;
      isPressed = false;
      
      scene.tweens.killTweensOf(faceContainer);
      scene.tweens.add({
        targets: faceContainer,
        y: 0, // Pop back up
        duration: 200, ease: 'Back.easeOut'
      });
      
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        scaleX: 1, scaleY: 1,
        duration: 200, ease: 'Back.easeOut'
      });

      if (callback) callback();
    });

    // Handle touch cancel/drag off safely
    container.on('pointerupoutside', () => {
      if (!isPressed) return;
      isPressed = false;
      
      scene.tweens.killTweensOf(faceContainer);
      scene.tweens.add({ targets: faceContainer, y: 0, duration: 200, ease: 'Back.easeOut' });
      
      scene.tweens.killTweensOf(container);
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' });
    });

    return { container };
  }
}
