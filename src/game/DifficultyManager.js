import { PIECE_SHAPES, parsePieceShape } from './Pieces.js';
import { COLORS, GRID_SIZE } from '../utils/Constants.js';

const TIER_EASY_END = 9;
const TIER_MEDIUM_END = 22;

const TIER_WEIGHTS = {
  beginner:     { easy: 0.50, medium: 0.40, hard: 0.10 },
  intermediate: { easy: 0.30, medium: 0.50, hard: 0.20 },
  advanced:     { easy: 0.10, medium: 0.45, hard: 0.45 },
  expert:       { easy: 0.10, medium: 0.35, hard: 0.55 },
};

const COMPLEMENTARY_THRESHOLDS = {
  beginner: 5,
  intermediate: 6,
};

const PARSED_SHAPES = PIECE_SHAPES.map(s => parsePieceShape(s));

export class DifficultyManager {
  constructor() {
    this.lastTurnHadHard = false;
  }

  generateSmartTurn(board, score, turnsPlayed, currentLevel = 1) {
    let tier = this._getTier(score);
    
    // Every 3rd level is inherently TOUGH (expert tier overrides)
    const isBossLevel = currentLevel % 3 === 0;
    if (isBossLevel) {
      tier = 'expert';
    }

    const analysis = this.analyzeBoard(board);
    const weights = this._getAdjustedWeights(tier, analysis);

    const pieces = [];
    const usedShapes = new Set();
    const usedSizes = new Set();
    let hasComplementary = false;

    const complementaryThreshold = COMPLEMENTARY_THRESHOLDS[tier];
    const needsComplementary = complementaryThreshold != null && turnsPlayed > 0 && turnsPlayed % complementaryThreshold === 0;

    for (let i = 0; i < 3; i++) {
      if (i === 0 && needsComplementary) {
        const helper = this._findComplementaryPiece(board, analysis, tier);
        if (helper) {
          pieces.push(helper);
          usedShapes.add(helper.shapeIndex);
          usedSizes.add(helper.size);
          hasComplementary = true;
          continue;
        }
      }

      let piece;
      let attempts = 0;
      do {
        piece = this._pickWeightedPiece(weights, tier, score);
        attempts++;
      } while (attempts < 12 && (usedShapes.has(piece.shapeIndex) || (usedSizes.size === 1 && pieces.length >= 1 && piece.size === pieces[0].size)));

      pieces.push(piece);
      usedShapes.add(piece.shapeIndex);
      usedSizes.add(piece.size);
    }

    if (tier === 'beginner' && this.lastTurnHadHard) {
      for (let i = 0; i < pieces.length; i++) {
        if (pieces[i].shapeIndex >= TIER_MEDIUM_END) {
          pieces[i] = this._pickFromTier('easy');
        }
      }
    }

    this.lastTurnHadHard = pieces.some(p => p.shapeIndex >= TIER_MEDIUM_END);

    if (hasComplementary) {
      const insertAt = Math.floor(Math.random() * 3);
      if (insertAt !== 0) {
        const tmp = pieces[0];
        pieces[0] = pieces[insertAt];
        pieces[insertAt] = tmp;
      }
    }

    return pieces;
  }

  analyzeBoard(board) {
    const grid = board.grid;
    const nearlyFullRows = [];
    const nearlyFullCols = [];
    let filledCount = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
      const emptyCols = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) emptyCols.push(c);
        else filledCount++;
      }
      if (emptyCols.length > 0 && emptyCols.length <= 3) {
        nearlyFullRows.push({ row: r, emptyCols });
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      const emptyRows = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][c] === null) emptyRows.push(r);
      }
      if (emptyRows.length > 0 && emptyRows.length <= 3) {
        nearlyFullCols.push({ col: c, emptyRows });
      }
    }

    const boardDensity = filledCount / (GRID_SIZE * GRID_SIZE);
    return { nearlyFullRows, nearlyFullCols, boardDensity };
  }

  _getTier(score) {
    if (score >= 5000) return 'expert';
    if (score >= 2000) return 'advanced';
    if (score >= 500) return 'intermediate';
    return 'beginner';
  }

  _getAdjustedWeights(tier, analysis) {
    const base = { ...TIER_WEIGHTS[tier] };

    // Safety valve: dense boards get easier pieces
    if (analysis.boardDensity > 0.70) {
      const relief = Math.min((analysis.boardDensity - 0.70) * 2, 0.3);
      base.easy += relief;
      base.hard = Math.max(0, base.hard - relief);
      const total = base.easy + base.medium + base.hard;
      base.easy /= total;
      base.medium /= total;
      base.hard /= total;
    }

    return base;
  }

  _pickWeightedPiece(weights, tier, score) {
    const roll = Math.random();
    let tierName;
    if (roll < weights.easy) tierName = 'easy';
    else if (roll < weights.easy + weights.medium) tierName = 'medium';
    else tierName = 'hard';

    if (tier === 'expert' && tierName === 'hard') {
      return this._pickExpertHardPiece();
    }

    if (tier === 'beginner' && tierName === 'easy') {
      return this._pickBeginnerEasyPiece();
    }

    return this._pickFromTier(tierName);
  }

  _pickFromTier(tierName) {
    let start, end;
    if (tierName === 'easy') { start = 0; end = TIER_EASY_END; }
    else if (tierName === 'medium') { start = TIER_EASY_END; end = TIER_MEDIUM_END; }
    else { start = TIER_MEDIUM_END; end = PIECE_SHAPES.length; }

    const idx = start + Math.floor(Math.random() * (end - start));
    return this._buildPiece(idx);
  }

  _pickBeginnerEasyPiece() {
    // Prioritize horizontal bar pieces (width > height) for beginners
    const horizontalIndices = [];
    for (let i = 0; i < TIER_EASY_END; i++) {
      if (PARSED_SHAPES[i].width > PARSED_SHAPES[i].height) {
        horizontalIndices.push(i);
      }
    }
    if (horizontalIndices.length > 0 && Math.random() < 0.35) {
      const idx = horizontalIndices[Math.floor(Math.random() * horizontalIndices.length)];
      return this._buildPiece(idx);
    }
    return this._pickFromTier('easy');
  }

  _pickExpertHardPiece() {
    // Higher chance of awkward shapes (3x3 square, plus sign)
    const awkwardIndices = [];
    for (let i = TIER_MEDIUM_END; i < PIECE_SHAPES.length; i++) {
      const s = PARSED_SHAPES[i];
      if ((s.width >= 3 && s.height >= 3) || s.size >= 9) {
        awkwardIndices.push(i);
      }
    }
    if (awkwardIndices.length > 0 && Math.random() < 0.4) {
      const idx = awkwardIndices[Math.floor(Math.random() * awkwardIndices.length)];
      return this._buildPiece(idx);
    }
    return this._pickFromTier('hard');
  }

  _findComplementaryPiece(board, analysis, tier) {
    const targets = [
      ...analysis.nearlyFullRows.map(r => ({ type: 'row', index: r.row, gaps: r.emptyCols })),
      ...analysis.nearlyFullCols.map(c => ({ type: 'col', index: c.col, gaps: c.emptyRows })),
    ];

    if (targets.length === 0) return null;
    if (targets.length > 6) return null;

    // Sort by fewest gaps first (most helpful to complete)
    targets.sort((a, b) => a.gaps.length - b.gaps.length);
    const target = targets[0];

    // Build a set of gap positions for matching
    const gapPositions = new Set();
    if (target.type === 'row') {
      for (const c of target.gaps) gapPositions.add(`${target.index},${c}`);
    } else {
      for (const r of target.gaps) gapPositions.add(`${r},${target.index}`);
    }

    // Search through easy+medium tier shapes for one that fills 2+ gap cells
    const searchEnd = tier === 'beginner' ? TIER_MEDIUM_END : PIECE_SHAPES.length;
    let bestMatch = null;
    let bestOverlap = 0;
    let totalChecks = 0;
    const MAX_CHECKS = 200;

    for (let shapeIdx = 0; shapeIdx < searchEnd; shapeIdx++) {
      const shape = PARSED_SHAPES[shapeIdx];

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (++totalChecks > MAX_CHECKS) break;
          if (!board.canPlace({ cells: shape.cells }, r, c)) continue;

          let overlap = 0;
          for (const cell of shape.cells) {
            if (gapPositions.has(`${r + cell.row},${c + cell.col}`)) overlap++;
          }

          if (overlap >= Math.min(2, target.gaps.length) && overlap > bestOverlap) {
            bestOverlap = overlap;
            bestMatch = shapeIdx;
          }
        }
        if (totalChecks > MAX_CHECKS) break;
      }

      if (bestOverlap >= target.gaps.length || totalChecks > MAX_CHECKS) break;
    }

    if (bestMatch !== null) return this._buildPiece(bestMatch);
    return null;
  }

  _buildPiece(shapeIndex) {
    const shape = PARSED_SHAPES[shapeIndex];
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    return {
      ...shape,
      color: COLORS[colorIndex],
      colorIndex,
      shapeIndex
    };
  }
}
