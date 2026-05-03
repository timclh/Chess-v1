/**
 * Daily Puzzle Service
 *
 * Manages the daily puzzle rotation, streak tracking, and history.
 * Puzzles are selected deterministically from the pool using
 * a date-seeded index so all users see the same puzzle each day.
 */

import config from '../config';

const { streakStorageKey, historyStorageKey } = config.puzzle;

// ── Date helpers ──────────────────────────────────────────

/** Get today's date string in YYYY-MM-DD (UTC) */
function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Convert a date key to a day number (days since epoch) */
function dayNumber(dateKey) {
  return Math.floor(new Date(dateKey + 'T00:00:00Z').getTime() / 86400000);
}

// ── Streak ────────────────────────────────────────────────

/**
 * Load streak data from localStorage.
 * @returns {{ current: number, best: number, lastDate: string|null }}
 */
export function getStreak() {
  try {
    const raw = localStorage.getItem(streakStorageKey);
    if (!raw) return { current: 0, best: 0, lastDate: null };
    return JSON.parse(raw);
  } catch {
    return { current: 0, best: 0, lastDate: null };
  }
}

/**
 * Record that the user completed today's puzzle.
 * Returns the updated streak.
 */
export function recordPuzzleCompletion() {
  const today = todayKey();
  const streak = getStreak();

  // Already completed today
  if (streak.lastDate === today) return streak;

  const todayNum = dayNumber(today);
  const lastNum = streak.lastDate ? dayNumber(streak.lastDate) : -999;
  const isConsecutive = todayNum - lastNum === 1;

  const newCurrent = isConsecutive ? streak.current + 1 : 1;
  const newBest = Math.max(streak.best, newCurrent);

  const updated = { current: newCurrent, best: newBest, lastDate: today };
  localStorage.setItem(streakStorageKey, JSON.stringify(updated));

  // Also save to history
  savePuzzleHistory(today, true);

  return updated;
}

// ── History ───────────────────────────────────────────────

/**
 * Get puzzle completion history.
 * @returns {Object<string, boolean>}  dateKey → completed
 */
export function getPuzzleHistory() {
  try {
    const raw = localStorage.getItem(historyStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save a puzzle result for a specific date */
function savePuzzleHistory(dateKey, completed) {
  const history = getPuzzleHistory();
  history[dateKey] = completed;

  // Keep only last 90 days
  const keys = Object.keys(history).sort();
  if (keys.length > 90) {
    keys.slice(0, keys.length - 90).forEach(k => delete history[k]);
  }

  localStorage.setItem(historyStorageKey, JSON.stringify(history));
}

/**
 * Whether today's puzzle has been completed.
 */
export function isTodayCompleted() {
  const history = getPuzzleHistory();
  return !!history[todayKey()];
}

// ── Puzzle Selection ──────────────────────────────────────

/**
 * Pick today's puzzle index from a pool.
 * Uses a simple date-seeded hash so it's deterministic.
 *
 * @param {number} poolSize  total number of puzzles available
 * @returns {number} index into the puzzle array
 */
export function todayPuzzleIndex(poolSize) {
  if (poolSize <= 0) return 0;
  const d = dayNumber(todayKey());
  // Simple hash: golden ratio multiplicative
  return Math.abs(Math.imul(d, 0x9e3779b9)) % poolSize;
}

/**
 * Get a human-readable label for the daily puzzle.
 */
export function dailyPuzzleLabel() {
  const today = todayKey();
  return `Daily Puzzle — ${today}`;
}
