import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';
import { SoundManager } from '../audio/SoundManager.js';

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  create() {
    this.events.once('shutdown', () => this.shutdown());
    this.cameras.main.setBackgroundColor(0x000000);

    // Initialize SoundManager for the game globally on first load
    SoundManager.init(this);

    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const cx = W / 2;
    const cy = H / 2;
    // Solid black background
    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0);

    // Initial positions for a very subtle slide-up reveal
    const nameTargetY = cy - 20;
    const studioTargetY = cy + 30;

    // Render text at 2x size and scale down for ultimate sharpness
    const name = this.add.text(cx, nameTargetY + 15, 'DEVLANCE', {
      fontSize: '96px', fontFamily: '"Arial Black", Impact, sans-serif',
      fontStyle: '900', color: '#ffffff', align: 'center', resolution: 3
    }).setOrigin(0.5, 0.5).setLetterSpacing(12).setScale(0.5).setAlpha(0); 

    const studio = this.add.text(cx, studioTargetY + 10, 'STUDIO', {
      fontSize: '40px', fontFamily: '"Arial", Helvetica, sans-serif',
      fontStyle: 'bold', color: '#888888', align: 'center', resolution: 3
    }).setOrigin(0.5, 0.5).setLetterSpacing(40).setScale(0.5).setAlpha(0);

    // The signature yellow line (2px exact height)
    const divider = this.add.rectangle(cx, cy + 4, 240, 2, 0xFFB300).setOrigin(0.5, 0.5).setScale(0, 1);

    const container = this.add.container(0, 0, [name, studio, divider]);
    
    // Smooth cinematic animation
    this.time.delayedCall(300, () => {
      // Step 1: Smoothly stretch the yellow line
      this.tweens.add({
        targets: divider,
        scaleX: 1,
        duration: 800,
        ease: 'Expo.easeOut',
        onComplete: () => {
          // Step 2: Smooth fade-in and slide-apart of the text
          this.tweens.add({
            targets: [name, studio],
            y: (target) => target === name ? nameTargetY : studioTargetY,
            alpha: 1,
            duration: 1000,
            ease: 'Cubic.easeOut'
          });

          // Step 3: Very slow cinematic zoom by scaling individual elements
          // This keeps the line exactly 2px high and text perfectly crisp
          this.tweens.add({
            targets: [name, studio],
            scaleX: 0.525,
            scaleY: 0.525,
            duration: 2500,
            ease: 'Sine.easeOut'
          });
          
          this.tweens.add({
            targets: divider,
            scaleX: 1.05,
            duration: 2500,
            ease: 'Sine.easeOut'
          });
        }
      });
    });

    // Fade out to black smoothly before transition
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: container,
        alpha: 0, 
        duration: 800, 
        ease: 'Sine.easeInOut',
        onComplete: () => this.scene.start('MenuScene')
      });
    });
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
