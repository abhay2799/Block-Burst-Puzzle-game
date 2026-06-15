import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  create() {
    this.events.once('shutdown', () => this.shutdown());
    this.cameras.main.setBackgroundColor(0x000000);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Floating particle background
    this._createParticleField();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;

    const glow = this.add.graphics().setDepth(0).setAlpha(0);
    glow.fillStyle(0xffffff, 0.05);
    glow.fillCircle(cx, cy, 180);
    glow.fillStyle(0xffffff, 0.04);
    glow.fillCircle(cx, cy, 130);
    glow.fillStyle(0xffffff, 0.03);
    glow.fillCircle(cx, cy, 220);

    const name = this.add.text(cx, cy - 8, 'DEVLANCE', {
      fontSize: '44px', fontFamily: 'Arial Black, Impact, Arial',
      fontStyle: 'bold', color: '#ffffff', align: 'center',
      stroke: '#000000', strokeThickness: 1
    }).setOrigin(0.5).setDepth(2).setAlpha(0);

    const studio = this.add.text(cx, cy + 32, 'S T U D I O', {
      fontSize: '16px', fontFamily: 'Arial, Helvetica',
      letterSpacing: 8, color: '#cccccc', align: 'center'
    }).setOrigin(0.5).setDepth(2).setAlpha(0);

    const lineW = 140;
    const lineY = cy + 55;
    const accent = this.add.graphics().setDepth(1).setAlpha(0);
    accent.fillStyle(0xd4af37, 1);
    accent.fillRect(cx - lineW / 2, lineY, lineW, 2);
    accent.fillStyle(0xd4af37, 0.4);
    accent.fillRect(cx - lineW / 2 - 3, lineY - 1, lineW + 6, 4);

    this.tweens.add({ targets: glow, alpha: 1, duration: 400, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: name, alpha: 1, duration: 600, delay: 200, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: studio, alpha: 1, duration: 500, delay: 400, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: accent, alpha: 1, duration: 400, delay: 600, ease: 'Power2' });

    // Shortened to 2 seconds for first-time users
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [glow, name, studio, accent],
        alpha: 0, duration: 500, ease: 'Sine.easeIn',
        onComplete: () => this.scene.start('MenuScene')
      });
    });
  }

  _createParticleField() {
    for (let i = 0; i < 15; i++) {
      const dot = this.add.graphics().setDepth(0);
      dot.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.03, 0.12));
      dot.fillCircle(0, 0, Phaser.Math.Between(1, 4));
      dot.setPosition(
        Phaser.Math.Between(20, GAME_WIDTH - 20),
        Phaser.Math.Between(20, GAME_HEIGHT - 20)
      );

      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(20, 60),
        x: dot.x + Phaser.Math.Between(-15, 15),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        delay: Phaser.Math.Between(0, 1500),
        repeat: -1,
        onRepeat: () => {
          dot.setPosition(
            Phaser.Math.Between(20, GAME_WIDTH - 20),
            Phaser.Math.Between(GAME_HEIGHT * 0.5, GAME_HEIGHT)
          );
          dot.setAlpha(Phaser.Math.FloatBetween(0.03, 0.12));
        }
      });
    }
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
