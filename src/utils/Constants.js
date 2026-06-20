export const GRID_SIZE = 8;
export const CELL_SIZE = 46;
export const GRID_PADDING = 3;
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 1040;

// Compute centered grid offset
const totalGridWidth = GRID_SIZE * (CELL_SIZE + GRID_PADDING) - GRID_PADDING;
export const GRID_OFFSET_X = Math.floor((GAME_WIDTH - totalGridWidth) / 2);
export const GRID_OFFSET_Y = 185;

export const PIECE_SCALE_SMALL = 0.55;
export const PIECE_SCALE_FULL = 1.0;
export const PIECE_AREA_Y = 880;

export const DRAG_FINGER_OFFSET_Y = -240; // Increased to ensure pieces never get under the thumb on large phones

export const COLORS = [
  0xEF7A1D,  // Classic Orange
  0x60C835,  // Classic Green
  0xD32431,  // Classic Red
  0x3275F9,  // Classic Blue
  0xF4B324,  // Classic Yellow
  0x9E54E5,  // Classic Purple
  0x24C3D6,  // Classic Cyan
  0xE34081,  // Classic Pink
];

export const GRID_BG_COLOR = 0x16213e;
export const GRID_LINE_COLOR = 0x0f3460;
export const GRID_CELL_EMPTY = 0x1a1a3e;
export const HIGHLIGHT_VALID = 0x4ade80;
export const HIGHLIGHT_INVALID = 0xef4444;

export const TIMING = {
  FLASH_DURATION: 120, // Snappier line flash
  SHRINK_DURATION: 250, // Faster block shrink during clears
  SHAKE_DURATION: 180, // Tighter camera shake
  SCORE_POP_DURATION: 400, // Faster text popups
  COMBO_TEXT_DURATION: 1000, 
  PIECE_RETURN_DURATION: 200, // Instant snap-back on invalid placement
  PIECE_PLACE_DURATION: 120, // Near-instant placement
};

export const SCORING = {
  PLACEMENT_PER_CELL: 1,
  LINE_CLEAR_BASE: 10,
  MULTI_LINE_BONUS_PER_LINE: 10,
};

export const VISUAL_SETTINGS = {
  laserSweep: true,
  shockwaveRing: true,
  flashPulse: true,
  slowMotion: true,
  comboStreakParticles: true,
  impactWobble: true,
  parallaxBackground: true,
  settleAnimation: true,
  edgeGlow: true,
};
