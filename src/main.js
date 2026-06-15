import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { SplashScene } from './scenes/SplashScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/Constants.js';
import { AdManager } from './ads/AdManager.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    activePointers: 1,
    touch: {
      target: null,
      capture: true
    }
  },
  scene: [BootScene, SplashScene, MenuScene, GameScene, GameOverScene, PauseScene]
};

let game;
document.fonts.ready.then(() => {
  game = new Phaser.Game(config);
  AdManager._gameInstance = game;

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && game.scene) {
      const scenes = game.scene.getScenes(true);
      for (const scene of scenes) {
        if (scene.input) {
          scene.input.enabled = true;
        }
      }
    }
  });
});
