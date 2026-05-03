/**
 * Frontend configuration — environment variables + defaults.
 * Single source of truth for all config across the React app.
 */

const config = {
  // ── Backend ──────────────────────────────────────────
  wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:3030',

  // ── Firebase (checked at runtime by firebase.js) ────
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  },

  // ── Game Defaults ────────────────────────────────────
  defaultDifficulty: 2,
  maxGameHistory: 100,
  maxLeaderboard: 50,

  // ── AI Engine ────────────────────────────────────────
  ai: {
    coach: { depth: 30, timeMs: 15000 },
    opponent: {
      // indexed by difficulty 1–4
      depth: [8, 9, 10, 11],
      timeMs: [500, 700, 1000, 1200],
    },
    positionEval: { depth: 26, timeMs: 8000 },
    cacheSize: 200,
    cacheDepthThreshold: 14,
  },

  // ── ELO ──────────────────────────────────────────────
  elo: {
    defaultRating: 1200,
    kFactorNew: 40,
    kFactorRegular: 20,
    kFactorMaster: 10,
    provisionalThreshold: 30,
    masterThreshold: 2400,
  },

  // ── Daily Puzzle ─────────────────────────────────────
  puzzle: {
    resetHourUTC: 0,
    streakStorageKey: 'qi_arena_puzzle_streak',
    historyStorageKey: 'qi_arena_puzzle_history',
  },

  // ── localStorage Keys ────────────────────────────────
  storage: {
    gameHistory: 'chess_game_history',
    players: 'chess_players',
    savedGame: 'chess_saved_game',
    userPrefs: 'qi_arena_prefs',
    eloRatings: 'qi_arena_elo',
  },
};

export default config;
