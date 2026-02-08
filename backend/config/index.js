/**
 * Central configuration — all environment variables and defaults.
 * Import this instead of reading process.env directly.
 */

const config = {
  // ── Server ───────────────────────────────────────────────
  port: parseInt(process.env.WS_PORT || process.env.PORT || '3030', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // ── CORS ─────────────────────────────────────────────────
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['*'],

  // ── Game Rooms ───────────────────────────────────────────
  roomTTL: parseInt(process.env.ROOM_TTL || '7200000', 10),         // 2 hours
  roomCleanupInterval: parseInt(process.env.ROOM_CLEANUP || '1800000', 10), // 30 min
  emptyRoomTimeout: parseInt(process.env.EMPTY_ROOM_TIMEOUT || '60000', 10), // 1 min

  // ── ELO ──────────────────────────────────────────────────
  elo: {
    defaultRating: parseInt(process.env.ELO_DEFAULT || '1200', 10),
    kFactorNew: parseInt(process.env.ELO_K_NEW || '40', 10),        // first 30 games
    kFactorRegular: parseInt(process.env.ELO_K_REGULAR || '20', 10),
    kFactorMaster: parseInt(process.env.ELO_K_MASTER || '10', 10),  // rating > 2400
    provisionalThreshold: 30,                                         // games count
    masterThreshold: 2400,
  },

  // ── Daily Puzzle ─────────────────────────────────────────
  puzzle: {
    resetHourUTC: parseInt(process.env.PUZZLE_RESET_HOUR || '0', 10),
  },

  // ── Logging ──────────────────────────────────────────────
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
