import { SCORING } from '../utils/Constants.js';

export class ScoreManager {
  constructor() {
    this.score = 0;
    this.combo = 0;
    this.highScore = this.loadHighScore();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
  }

  addPlacementPoints(cellCount) {
    const points = cellCount * SCORING.PLACEMENT_PER_CELL;
    this.score += points;
    return points;
  }

  addLineClearPoints(lineCount) {
    if (lineCount === 0) {
      this.combo = 0;
      return 0;
    }

    this.combo++;

    // Base points for lines cleared
    let points = lineCount * SCORING.LINE_CLEAR_BASE;

    // Multi-line bonus (triangular: 1=10, 2=30, 3=60, 4=100...)
    for (let i = 1; i <= lineCount; i++) {
      points += i * SCORING.MULTI_LINE_BONUS_PER_LINE;
    }

    // Combo multiplier
    points *= this.combo;

    this.score += points;
    return points;
  }

  getCombo() {
    return this.combo;
  }

  getScore() {
    return this.score;
  }

  setScore(value) {
    this.score = value;
  }

  getHighScore() {
    return this.highScore;
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('blockblast_highscore', this.highScore.toString());
      } catch (e) { /* localStorage unavailable */ }
    }
  }

  loadHighScore() {
    try {
      const saved = localStorage.getItem('blockblast_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  }
}
