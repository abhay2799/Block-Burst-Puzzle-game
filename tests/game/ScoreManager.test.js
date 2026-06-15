import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../../src/game/ScoreManager.js';

describe('ScoreManager', () => {
  let sm;

  beforeEach(() => {
    sm = new ScoreManager();
  });

  describe('initial state', () => {
    it('starts with score 0', () => {
      expect(sm.getScore()).toBe(0);
    });

    it('starts with combo 0', () => {
      expect(sm.getCombo()).toBe(0);
    });
  });

  describe('addPlacementPoints', () => {
    it('adds 1 point per cell', () => {
      const pts = sm.addPlacementPoints(4);
      expect(pts).toBe(4);
      expect(sm.getScore()).toBe(4);
    });

    it('accumulates across calls', () => {
      sm.addPlacementPoints(3);
      sm.addPlacementPoints(5);
      expect(sm.getScore()).toBe(8);
    });
  });

  describe('addLineClearPoints', () => {
    it('returns 0 and resets combo when 0 lines', () => {
      sm.addLineClearPoints(1);
      const pts = sm.addLineClearPoints(0);
      expect(pts).toBe(0);
      expect(sm.getCombo()).toBe(0);
    });

    it('single line clear gives 20 points (10 base + 10 bonus) on first combo', () => {
      const pts = sm.addLineClearPoints(1);
      expect(pts).toBe(20);
      expect(sm.getCombo()).toBe(1);
    });

    it('double line clear gives 50 points on first combo', () => {
      const pts = sm.addLineClearPoints(2);
      // 2*10 + (1*10 + 2*10) = 20 + 30 = 50
      expect(pts).toBe(50);
    });

    it('combo multiplies points', () => {
      sm.addLineClearPoints(1); // combo 1 -> 20 pts
      const pts = sm.addLineClearPoints(1); // combo 2 -> 20 * 2 = 40 pts
      expect(pts).toBe(40);
      expect(sm.getCombo()).toBe(2);
    });

    it('triple line clear: 90 points on first combo', () => {
      const pts = sm.addLineClearPoints(3);
      // 3*10 + (1*10 + 2*10 + 3*10) = 30 + 60 = 90
      expect(pts).toBe(90);
    });

    it('quad line clear: 140 points on first combo', () => {
      const pts = sm.addLineClearPoints(4);
      // 4*10 + (1*10 + 2*10 + 3*10 + 4*10) = 40 + 100 = 140
      expect(pts).toBe(140);
    });
  });

  describe('reset', () => {
    it('resets score and combo', () => {
      sm.addPlacementPoints(10);
      sm.addLineClearPoints(2);
      sm.reset();
      expect(sm.getScore()).toBe(0);
      expect(sm.getCombo()).toBe(0);
    });
  });

  describe('setScore', () => {
    it('overrides current score', () => {
      sm.setScore(999);
      expect(sm.getScore()).toBe(999);
    });
  });
});
