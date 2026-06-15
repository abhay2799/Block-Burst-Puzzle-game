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

export const DRAG_FINGER_OFFSET_Y = -70;

export const COLORS = [
  0xFF6B35,  // Vivid Orange
  0x2EC866,  // Bold Green
  0xFF3B3B,  // Punchy Red
  0x2B7AFF,  // Electric Blue
  0xFFC107,  // Bold Yellow
  0xAA44FF,  // Vivid Purple
  0x00C9B7,  // Bright Teal
  0xFF2D7B,  // Hot Pink
];

export const GRID_BG_COLOR = 0x16213e;
export const GRID_LINE_COLOR = 0x0f3460;
export const GRID_CELL_EMPTY = 0x1a1a3e;
export const HIGHLIGHT_VALID = 0x4ade80;
export const HIGHLIGHT_INVALID = 0xef4444;

export const TIMING = {
  FLASH_DURATION: 140,
  SHRINK_DURATION: 320,
  SHAKE_DURATION: 220,
  SCORE_POP_DURATION: 500,
  COMBO_TEXT_DURATION: 1200,
  PIECE_RETURN_DURATION: 350,
  PIECE_PLACE_DURATION: 220,
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
