import { COLORS } from '../utils/Constants.js';

// Each shape is a 5x5 binary string where '1' = filled cell
// Read left-to-right, top-to-bottom (row-major)
export const PIECE_SHAPES = [
  // Single blocks
  "0000000000001000000000000",  // 1x1 dot

  // Dominoes (2 cells)
  "0000000000011000000000000",  // 1x2 horizontal
  "0000000100001000000000000",  // 2x1 vertical

  // Triominoes (3 cells)
  "0000000000111000000000000",  // 1x3 horizontal
  "0000000100001000010000000",  // 3x1 vertical
  "0000000100011000000000000",  // L-shape small (down-right)
  "0000001100010000000000000",  // L-shape small (down-left)
  "0000000110001000000000000",  // L-shape small (up-right)
  "0000001000011000000000000",  // L-shape small (up-left)

  // Tetrominoes (4 cells)
  "0000000001111000000000000",  // I-piece horizontal (4)
  "0000000100001000010000100",  // I-piece vertical (4) - uses row 0
  "0000001100011000000000000",  // O-piece (2x2 square)
  "0000000100011000010000000",  // T-piece (pointing down)
  "0000001000011100000000000",  // T-piece (pointing right)
  "0000000100011000010000000",  // S-piece vertical
  "0000000110011000000000000",  // S-piece horizontal
  "0000001100001100000000000",  // Z-piece horizontal
  "0000000100011000100000000",  // Z-piece vertical
  "0000001000010000110000000",  // L-piece (standard)
  "0000000100001000011000000",  // J-piece (mirror L)
  "0000001100010000010000000",  // L-piece rotated
  "0000000110001000010000000",  // J-piece rotated

  // Pentominoes (5 cells)
  "0000000000111110000000000",  // I-piece horizontal (5)
  "0010000100001000010000100",  // I-piece vertical (5)

  // Larger shapes
  "0000001110011100111000000",  // 3x3 square (9 cells)
  "0000001110011100000000000",  // 2x3 rectangle
  "0000001100011000110000000",  // 3x2 rectangle
  "0000000110001100000000000",  // 2x2 offset

  // Large L-shapes
  "0000001000010000111000000",  // Large L (3 tall, 3 wide)
  "0000000010000100111000000",  // Large J (mirror large L)
  "0000001110010000100000000",  // Large L rotated
  "0000001110001000010000000",  // Large J rotated

  // Corner/stair shapes
  "0000001100010000000000000",  // Corner 2x2 (top-left)
  "0000000110001000000000000",  // Corner 2x2 (top-right)
  "0000000100011000000000000",  // Corner 2x2 (bottom-left)
  "0000001000011000000000000",  // Corner 2x2 (bottom-right)

  // T-shapes extended
  "0000001110001000010000000",  // T extended down
  "0000000100011100010000000",  // Plus/cross shape

  // Extra bar
  "0000000000011110000000000",  // 1x4 horizontal offset
];

export function parsePieceShape(shapeStr) {
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (shapeStr[r * 5 + c] === '1') {
        cells.push({ row: r, col: c });
      }
    }
  }

  // Normalize: shift so minimum row and col are 0
  let minRow = 5, minCol = 5;
  for (const cell of cells) {
    if (cell.row < minRow) minRow = cell.row;
    if (cell.col < minCol) minCol = cell.col;
  }
  for (const cell of cells) {
    cell.row -= minRow;
    cell.col -= minCol;
  }

  // Calculate bounding box
  let maxRow = 0, maxCol = 0;
  for (const cell of cells) {
    if (cell.row > maxRow) maxRow = cell.row;
    if (cell.col > maxCol) maxCol = cell.col;
  }

  return {
    cells,
    width: maxCol + 1,
    height: maxRow + 1,
    size: cells.length
  };
}

export function generatePiece(hardPieceChance = 0) {
  let shapeIndex;

  // Hard pieces are indices 22+ (pentominoes, 3x3, large L-shapes)
  // Easy pieces are indices 0-8 (small shapes)
  if (Math.random() < hardPieceChance) {
    // Pick from hard shapes (larger, awkward)
    shapeIndex = 22 + Math.floor(Math.random() * (PIECE_SHAPES.length - 22));
  } else {
    // Pick from any shape
    shapeIndex = Math.floor(Math.random() * PIECE_SHAPES.length);
  }

  const colorIndex = Math.floor(Math.random() * COLORS.length);
  const shape = parsePieceShape(PIECE_SHAPES[shapeIndex]);

  return {
    ...shape,
    color: COLORS[colorIndex],
    colorIndex,
    shapeIndex
  };
}

export function generateTurn(hardPieceChance = 0) {
  return [
    generatePiece(hardPieceChance),
    generatePiece(hardPieceChance),
    generatePiece(hardPieceChance)
  ];
}
