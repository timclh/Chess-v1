/**
 * User Rating Manager
 *
 * Persists per-game-type ELO ratings in localStorage (offline)
 * and syncs to Firebase when available.
 */

import config from '../config';
import EloService from './EloService';
import { GAME_TYPE } from '../constants';
import {
  saveUserProfile,
  getUserProfile,
  isFirebaseConfigured,
} from '../firebase';

const STORAGE_KEY = config.storage.eloRatings;

// ── Local storage ──────────────────────────────────────────

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return getDefaults();
}

function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDefaults() {
  return {
    chess: {
      rating: config.elo.defaultRating,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      history: [],          // last 20 rating snapshots
    },
    xiangqi: {
      rating: config.elo.defaultRating,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      history: [],
    },
  };
}

// ── Public API ──────────────────────────────────────────────

/**
 * Get current ratings for both game types.
 */
export function getRatings() {
  return loadLocal();
}

/**
 * Get rating for a specific game type.
 * @param {'chess'|'xiangqi'} gameType
 */
export function getRating(gameType) {
  const data = loadLocal();
  return data[gameType] || data.chess;
}

/**
 * Record a game result and update ELO.
 *
 * @param {object} opts
 * @param {'chess'|'xiangqi'} opts.gameType
 * @param {'win'|'loss'|'draw'} opts.result
 * @param {number} [opts.difficulty]       - AI difficulty (1–4)
 * @param {number} [opts.opponentRating]   - for PvP
 * @param {number} [opts.opponentGames]    - for PvP
 * @param {string} [opts.userId]           - Firebase UID for cloud sync
 * @returns {{ newRating: number, delta: number }}
 */
export async function recordResult({
  gameType = GAME_TYPE.CHESS,
  result,
  difficulty,
  opponentRating,
  opponentGames,
  userId,
}) {
  const data = loadLocal();
  const gt = data[gameType] || getDefaults()[GAME_TYPE.CHESS];

  const scoreMap = { win: 1, draw: 0.5, loss: 0 };
  const score = scoreMap[result] ?? 0;

  let newRating, delta;

  if (opponentRating != null) {
    // PvP
    const res = EloService.calculate(
      { rating: gt.rating, gamesPlayed: gt.gamesPlayed },
      { rating: opponentRating, gamesPlayed: opponentGames || 0 },
      score
    );
    newRating = res.newRatingA;
    delta = res.deltaA;
  } else {
    // vs AI
    const res = EloService.calculateVsAI(
      { rating: gt.rating, gamesPlayed: gt.gamesPlayed },
      difficulty || 2,
      score
    );
    newRating = res.newRating;
    delta = res.delta;
  }

  // Update local
  gt.rating = newRating;
  gt.gamesPlayed += 1;
  if (result === 'win') gt.wins += 1;
  else if (result === 'loss') gt.losses += 1;
  else gt.draws += 1;

  // Keep last 20 rating snapshots
  gt.history.push({ rating: newRating, date: new Date().toISOString() });
  if (gt.history.length > 20) gt.history.shift();

  data[gameType] = gt;
  saveLocal(data);

  // Sync to cloud
  if (userId && isFirebaseConfigured()) {
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        const updated = { ...profile };
        if (!updated.elo) updated.elo = {};
        updated.elo[gameType] = {
          rating: gt.rating,
          gamesPlayed: gt.gamesPlayed,
          wins: gt.wins,
          losses: gt.losses,
          draws: gt.draws,
        };
        await saveUserProfile(userId, updated);
      }
    } catch (err) {
      console.warn('ELO cloud sync failed:', err);
    }
  }

  return { newRating, delta };
}
