import { describe, it, expect } from 'vitest';
import { parsePieceShape, generatePiece, generateTurn, PIECE_SHAPES } from '../../src/game/Pieces.js';

describe('Pieces', () => {
  describe('PIECE_SHAPES', () => {
    it('has 39 shapes', () => {
      expect(PIECE_SHAPES.length).toBe(39);
    });

    it('all shapes are 25 characters long', () => {
      for (const shape of PIECE_SHAPES) {
        expect(shape.length).toBe(25);
      }
    });

    it('all shapes contain only 0 and 1', () => {
      for (const shape of PIECE_SHAPES) {
        expect(shape).toMatch(/^[01]+$/);
      }
    });

    it('all shapes have at least 1 filled cell', () => {
      for (const shape of PIECE_SHAPES) {
        expect(shape.includes('1')).toBe(true);
      }
    });
  });

  describe('parsePieceShape', () => {
    it('parses 1x1 dot correctly', () => {
      const result = parsePieceShape('0000000000001000000000000');
      expect(result.cells.length).toBe(1);
      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
      expect(result.size).toBe(1);
    });

    it('parses 1x2 horizontal correctly', () => {
      const result = parsePieceShape('0000000000011000000000000');
      expect(result.cells.length).toBe(2);
      expect(result.width).toBe(2);
      expect(result.height).toBe(1);
    });

    it('normalizes cells to start at (0,0)', () => {
      const result = parsePieceShape('0000000000001000000000000');
      expect(result.cells[0].row).toBe(0);
      expect(result.cells[0].col).toBe(0);
    });

    it('parses 3x3 square as 9 cells', () => {
      const result = parsePieceShape('0000001110011100111000000');
      expect(result.size).toBe(9);
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);
    });
  });

  describe('generatePiece', () => {
    it('returns a piece with required properties', () => {
      const piece = generatePiece(0);
      expect(piece.cells).toBeDefined();
      expect(piece.width).toBeGreaterThan(0);
      expect(piece.height).toBeGreaterThan(0);
      expect(piece.size).toBeGreaterThan(0);
      expect(piece.colorIndex).toBeGreaterThanOrEqual(0);
      expect(piece.colorIndex).toBeLessThan(8);
      expect(piece.color).toBeDefined();
      expect(piece.shapeIndex).toBeGreaterThanOrEqual(0);
    });

    it('with hardPieceChance 1.0, picks from hard shapes (index >= 21)', () => {
      let allHard = true;
      for (let i = 0; i < 50; i++) {
        const piece = generatePiece(1.0);
        if (piece.shapeIndex < 21) {
          allHard = false;
          break;
        }
      }
      expect(allHard).toBe(true);
    });
  });

  describe('generateTurn', () => {
    it('returns exactly 3 pieces', () => {
      const turn = generateTurn(0);
      expect(turn.length).toBe(3);
    });

    it('each piece is valid', () => {
      const turn = generateTurn(0.5);
      for (const piece of turn) {
        expect(piece.cells.length).toBeGreaterThan(0);
        expect(piece.width).toBeGreaterThan(0);
        expect(piece.height).toBeGreaterThan(0);
      }
    });
  });
});
