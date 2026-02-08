/**
 * Application-wide constants.
 */

// ── Game Types ────────────────────────────────────────────
export const GAME_TYPE = {
  CHESS: 'chess',
  XIANGQI: 'xiangqi',
};

// ── Difficulty Levels ─────────────────────────────────────
export const DIFFICULTY = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
  EXPERT: 4,
};

export const DIFFICULTY_LABEL = {
  [DIFFICULTY.EASY]: 'Easy',
  [DIFFICULTY.MEDIUM]: 'Medium',
  [DIFFICULTY.HARD]: 'Hard',
  [DIFFICULTY.EXPERT]: 'Expert',
};

// ── Game Results ──────────────────────────────────────────
export const RESULT = {
  WIN: 'win',
  LOSS: 'loss',
  DRAW: 'draw',
};

// ── Player Colors ─────────────────────────────────────────
export const COLOR = {
  WHITE: 'w',   // also "Red" in Xiangqi
  BLACK: 'b',
};

// ── ELO Rank Labels ───────────────────────────────────────
export const RANK_THRESHOLDS = [
  { min: 2400, label: 'Grandmaster', icon: '👑' },
  { min: 2200, label: 'Master',      icon: '🏆' },
  { min: 2000, label: 'Expert',      icon: '⭐' },
  { min: 1800, label: 'Class A',     icon: '🔷' },
  { min: 1600, label: 'Class B',     icon: '🔶' },
  { min: 1400, label: 'Class C',     icon: '🟢' },
  { min: 1200, label: 'Class D',     icon: '🟡' },
  { min: 1000, label: 'Beginner',    icon: '🟠' },
  { min: 0,    label: 'Novice',      icon: '⚪' },
];

// ── WebSocket Message Types ───────────────────────────────
export const WS_MSG = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  GAME_START: 'game_start',
  MOVE: 'move',
  OPPONENT_MOVE: 'opponent_move',
  CHAT: 'chat',
  RESIGN: 'resign',
  DRAW_OFFER: 'draw_offer',
  DRAW_RESPONSE: 'draw_response',
  DRAW_OFFERED: 'draw_offered',
  DRAW_DECLINED: 'draw_declined',
  REMATCH: 'rematch',
  REMATCH_START: 'rematch_start',
  GAME_OVER: 'game_over',
  OPPONENT_JOINED: 'opponent_joined',
  OPPONENT_DISCONNECTED: 'opponent_disconnected',
  ERROR: 'error',
};

// ── Routes ────────────────────────────────────────────────
export const ROUTES = {
  '/': 'home',
  '/chess': 'game',
  '/xiangqi': 'xiangqi',
  '/puzzles': 'puzzles',
  '/openings': 'openings',
  '/multiplayer': 'multiplayer',
  '/leaderboard': 'leaderboard',
  '/coach': 'coach',
  '/learn': 'learn',
};
