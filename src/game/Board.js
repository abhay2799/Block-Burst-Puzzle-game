import { GRID_SIZE } from '../utils/Constants.js';

export class Board {
  constructor() {
    this.grid = [];
    this.reset();
  }

  reset() {
    this.grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        this.grid[r][c] = null;
      }
    }
  }

  getCell(row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return undefined;
    return this.grid[row][col];
  }

  canPlace(piece, gridRow, gridCol) {
    for (const cell of piece.cells) {
      const r = gridRow + cell.row;
      const c = gridCol + cell.col;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
      if (this.grid[r][c] !== null) return false;
    }
    return true;
  }

  place(piece, gridRow, gridCol) {
    const placedCells = [];
    for (const cell of piece.cells) {
      const r = gridRow + cell.row;
      const c = gridCol + cell.col;
      this.grid[r][c] = piece.colorIndex;
      placedCells.push({ row: r, col: c, color: piece.color, colorIndex: piece.colorIndex });
    }
    return placedCells;
  }

  checkClears() {
    const rowsToClear = [];
    const colsToClear = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      let full = true;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c] === null) { full = false; break; }
      }
      if (full) rowsToClear.push(r);
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (this.grid[r][c] === null) { full = false; break; }
      }
      if (full) colsToClear.push(c);
    }

    return { rows: rowsToClear, cols: colsToClear };
  }

  clearLines(clears) {
    const clearedCells = [];
    const cleared = new Uint8Array(GRID_SIZE * GRID_SIZE);

    // Snapshot colorIndex for all cells before nulling, so intersections retain color
    const colorSnapshot = new Array(GRID_SIZE * GRID_SIZE);
    for (const r of clears.rows) {
      for (let c = 0; c < GRID_SIZE; c++) {
        colorSnapshot[r * GRID_SIZE + c] = this.grid[r][c];
      }
    }
    for (const c of clears.cols) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const idx = r * GRID_SIZE + c;
        if (colorSnapshot[idx] === undefined) {
          colorSnapshot[idx] = this.grid[r][c];
        }
      }
    }

    for (const r of clears.rows) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const idx = r * GRID_SIZE + c;
        if (!cleared[idx]) {
          cleared[idx] = 1;
          clearedCells.push({ row: r, col: c, colorIndex: colorSnapshot[idx] });
        }
        this.grid[r][c] = null;
      }
    }

    for (const c of clears.cols) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const idx = r * GRID_SIZE + c;
        if (!cleared[idx]) {
          cleared[idx] = 1;
          clearedCells.push({ row: r, col: c, colorIndex: colorSnapshot[idx] });
        }
        this.grid[r][c] = null;
      }
    }

    return clearedCells;
  }

  canPieceFitAnywhere(piece) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.canPlace(piece, r, c)) return true;
      }
    }
    return false;
  }

  canAnyPieceFit(pieces) {
    for (const piece of pieces) {
      if (piece && this.canPieceFitAnywhere(piece)) return true;
    }
    return false;
  }

  getTotalLines(clears) {
    return clears.rows.length + clears.cols.length;
  }

  predictClears(piece, gridRow, gridCol) {
    const rowsToClear = [];
    const colsToClear = [];

    // Use Uint8Array for O(1) lookups instead of string-key Set
    const pieceMask = new Uint8Array(GRID_SIZE * GRID_SIZE);
    for (const cell of piece.cells) {
      pieceMask[(gridRow + cell.row) * GRID_SIZE + (gridCol + cell.col)] = 1;
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      let full = true;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c] === null && !pieceMask[r * GRID_SIZE + c]) {
          full = false;
          break;
        }
      }
      if (full) rowsToClear.push(r);
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (this.grid[r][c] === null && !pieceMask[r * GRID_SIZE + c]) {
          full = false;
          break;
        }
      }
      if (full) colsToClear.push(c);
    }

    return { rows: rowsToClear, cols: colsToClear };
  }
}
