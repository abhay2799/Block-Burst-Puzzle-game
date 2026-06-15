import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../src/game/Board.js';

describe('Board', () => {
  let board;

  beforeEach(() => {
    board = new Board();
  });

  describe('constructor and reset', () => {
    it('creates an 8x8 grid of nulls', () => {
      expect(board.grid.length).toBe(8);
      for (let r = 0; r < 8; r++) {
        expect(board.grid[r].length).toBe(8);
        for (let c = 0; c < 8; c++) {
          expect(board.grid[r][c]).toBeNull();
        }
      }
    });

    it('reset clears the grid', () => {
      board.grid[0][0] = 1;
      board.reset();
      expect(board.grid[0][0]).toBeNull();
    });
  });

  describe('getCell', () => {
    it('returns null for empty cell', () => {
      expect(board.getCell(0, 0)).toBeNull();
    });

    it('returns undefined for out-of-bounds', () => {
      expect(board.getCell(-1, 0)).toBeUndefined();
      expect(board.getCell(8, 0)).toBeUndefined();
      expect(board.getCell(0, -1)).toBeUndefined();
      expect(board.getCell(0, 8)).toBeUndefined();
    });

    it('returns colorIndex for occupied cell', () => {
      board.grid[3][4] = 2;
      expect(board.getCell(3, 4)).toBe(2);
    });
  });

  describe('canPlace', () => {
    const piece = {
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
      width: 2, height: 2, size: 3, colorIndex: 0, color: 0xFF4757
    };

    it('returns true for empty board valid position', () => {
      expect(board.canPlace(piece, 0, 0)).toBe(true);
      expect(board.canPlace(piece, 6, 6)).toBe(true);
    });

    it('returns false when piece goes out of bounds', () => {
      expect(board.canPlace(piece, 7, 7)).toBe(false);
      expect(board.canPlace(piece, -1, 0)).toBe(false);
    });

    it('returns false when cell is already occupied', () => {
      board.grid[0][0] = 1;
      expect(board.canPlace(piece, 0, 0)).toBe(false);
    });

    it('returns true when occupied cells dont overlap with piece', () => {
      board.grid[0][2] = 1;
      expect(board.canPlace(piece, 0, 0)).toBe(true);
    });
  });

  describe('place', () => {
    const piece = {
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      width: 2, height: 1, size: 2, colorIndex: 3, color: 0x1E90FF
    };

    it('places piece on the grid and returns placed cells', () => {
      const placed = board.place(piece, 2, 3);
      expect(placed.length).toBe(2);
      expect(board.grid[2][3]).toBe(3);
      expect(board.grid[2][4]).toBe(3);
    });
  });

  describe('checkClears', () => {
    it('detects full row', () => {
      for (let c = 0; c < 8; c++) {
        board.grid[3][c] = 1;
      }
      const clears = board.checkClears();
      expect(clears.rows).toContain(3);
      expect(clears.cols.length).toBe(0);
    });

    it('detects full column', () => {
      for (let r = 0; r < 8; r++) {
        board.grid[r][5] = 2;
      }
      const clears = board.checkClears();
      expect(clears.cols).toContain(5);
      expect(clears.rows.length).toBe(0);
    });

    it('detects both row and column', () => {
      for (let c = 0; c < 8; c++) board.grid[4][c] = 1;
      for (let r = 0; r < 8; r++) board.grid[r][2] = 1;
      const clears = board.checkClears();
      expect(clears.rows).toContain(4);
      expect(clears.cols).toContain(2);
    });

    it('returns empty when nothing is full', () => {
      board.grid[0][0] = 1;
      const clears = board.checkClears();
      expect(clears.rows.length).toBe(0);
      expect(clears.cols.length).toBe(0);
    });
  });

  describe('clearLines', () => {
    it('clears specified rows and returns cleared cells', () => {
      for (let c = 0; c < 8; c++) board.grid[0][c] = c % 4;
      const clearedCells = board.clearLines({ rows: [0], cols: [] });
      expect(clearedCells.length).toBe(8);
      for (let c = 0; c < 8; c++) {
        expect(board.grid[0][c]).toBeNull();
      }
    });

    it('does not duplicate cells at row/column intersection', () => {
      for (let c = 0; c < 8; c++) board.grid[2][c] = 1;
      for (let r = 0; r < 8; r++) board.grid[r][3] = 2;
      const clearedCells = board.clearLines({ rows: [2], cols: [3] });
      expect(clearedCells.length).toBe(8 + 8 - 1);
    });
  });

  describe('canAnyPieceFit', () => {
    it('returns true on empty board', () => {
      const piece = { cells: [{ row: 0, col: 0 }], width: 1, height: 1, size: 1 };
      expect(board.canAnyPieceFit([piece])).toBe(true);
    });

    it('returns false when board is completely full', () => {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          board.grid[r][c] = 1;
        }
      }
      const piece = { cells: [{ row: 0, col: 0 }], width: 1, height: 1, size: 1 };
      expect(board.canAnyPieceFit([piece])).toBe(false);
    });

    it('handles null pieces in the array', () => {
      const piece = { cells: [{ row: 0, col: 0 }], width: 1, height: 1, size: 1 };
      expect(board.canAnyPieceFit([null, piece, null])).toBe(true);
    });
  });

  describe('getTotalLines', () => {
    it('sums rows and cols', () => {
      expect(board.getTotalLines({ rows: [0, 2], cols: [3] })).toBe(3);
    });
  });

  describe('predictClears', () => {
    it('predicts row clear when piece completes it', () => {
      for (let c = 0; c < 7; c++) board.grid[4][c] = 1;
      const piece = { cells: [{ row: 0, col: 0 }], width: 1, height: 1, size: 1, colorIndex: 0 };
      const pred = board.predictClears(piece, 4, 7);
      expect(pred.rows).toContain(4);
    });

    it('predicts no clear when row is incomplete', () => {
      for (let c = 0; c < 5; c++) board.grid[4][c] = 1;
      const piece = { cells: [{ row: 0, col: 0 }], width: 1, height: 1, size: 1, colorIndex: 0 };
      const pred = board.predictClears(piece, 4, 5);
      expect(pred.rows.length).toBe(0);
    });
  });
});
