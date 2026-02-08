/**
 * Match Service
 *
 * Stores and retrieves game match records in Firestore.
 * Falls back to localStorage when Firebase is not configured.
 *
 * Firestore Schema:
 *   matches/{matchId}
 *     - players: [{ id, name, rating }]
 *     - gameType: 'chess' | 'xiangqi'
 *     - result: 'white' | 'black' | 'draw'
 *     - winner: uid | null
 *     - moves: ['e4', 'e5', ...]
 *     - pgn: string (for chess)
 *     - fen: string (final position)
 *     - opening: string (detected opening name)
 *     - duration: number (seconds)
 *     - mode: 'ai' | 'human' | 'coach'
 *     - difficulty: 1-4 (for AI games)
 *     - timestamp: serverTimestamp()
 */

import {
  db,
  isFirebaseConfigured,
} from '../firebase';

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  updateDoc,
  setDoc,
} from 'firebase/firestore';

import { GAME_TYPE } from '../constants';

const MATCHES_COLLECTION = 'matches';
const STATS_COLLECTION = 'globalStats';
const LOCAL_STORAGE_KEY = 'qi_arena_matches';

// ── Local Storage Fallback ─────────────────────────────────

function loadLocalMatches() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMatch(match) {
  const matches = loadLocalMatches();
  matches.unshift({ ...match, id: `local_${Date.now()}` });
  // Keep last 100 matches locally
  if (matches.length > 100) matches.length = 100;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(matches));
  return matches[0];
}

// ── Public API ─────────────────────────────────────────────

/**
 * Save a completed match.
 *
 * @param {Object} matchData
 * @param {string} matchData.gameType - 'chess' | 'xiangqi'
 * @param {Array} matchData.players - [{ id, name, rating }, ...]
 * @param {string} matchData.result - 'white' | 'black' | 'draw'
 * @param {string} [matchData.winnerId] - UID of winner (null for draw)
 * @param {Array} matchData.moves - Array of move strings
 * @param {string} [matchData.pgn] - PGN string (chess only)
 * @param {string} matchData.fen - Final position FEN
 * @param {string} [matchData.opening] - Opening name if detected
 * @param {number} matchData.duration - Game duration in seconds
 * @param {string} matchData.mode - 'ai' | 'human' | 'coach'
 * @param {number} [matchData.difficulty] - AI difficulty 1-4
 * @returns {Promise<Object>} Saved match with ID
 */
export async function saveMatch(matchData) {
  const match = {
    gameType: matchData.gameType || GAME_TYPE.CHESS,
    players: matchData.players || [],
    result: matchData.result,
    winnerId: matchData.winnerId || null,
    moves: matchData.moves || [],
    pgn: matchData.pgn || null,
    fen: matchData.fen || '',
    opening: matchData.opening || null,
    duration: matchData.duration || 0,
    mode: matchData.mode || 'ai',
    difficulty: matchData.difficulty || null,
    moveCount: (matchData.moves || []).length,
  };

  if (!isFirebaseConfigured() || !db) {
    // Fallback to localStorage
    return saveLocalMatch(match);
  }

  try {
    const matchRef = await addDoc(collection(db, MATCHES_COLLECTION), {
      ...match,
      timestamp: serverTimestamp(),
    });

    // Update global stats
    await updateGlobalStats(match.gameType, match.result);

    return { id: matchRef.id, ...match };
  } catch (error) {
    console.warn('Firestore save failed, using localStorage:', error);
    return saveLocalMatch(match);
  }
}

/**
 * Get recent matches for a user.
 *
 * @param {string} userId - User ID
 * @param {number} [count=20] - Number of matches to fetch
 * @returns {Promise<Array>} Array of match objects
 */
export async function getUserMatches(userId, count = 20) {
  if (!isFirebaseConfigured() || !db) {
    // Return local matches filtered by player
    return loadLocalMatches()
      .filter(m => m.players?.some(p => p.id === userId))
      .slice(0, count);
  }

  try {
    const matchesRef = collection(db, MATCHES_COLLECTION);
    // Query where user is a player
    const q = query(
      matchesRef,
      where('players', 'array-contains', { id: userId }),
      orderBy('timestamp', 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Firestore query failed:', error);
    return loadLocalMatches().slice(0, count);
  }
}

/**
 * Get recent matches globally.
 *
 * @param {string} [gameType] - Filter by game type
 * @param {number} [count=50] - Number of matches to fetch
 * @returns {Promise<Array>} Array of match objects
 */
export async function getRecentMatches(gameType, count = 50) {
  if (!isFirebaseConfigured() || !db) {
    let matches = loadLocalMatches();
    if (gameType) {
      matches = matches.filter(m => m.gameType === gameType);
    }
    return matches.slice(0, count);
  }

  try {
    const matchesRef = collection(db, MATCHES_COLLECTION);
    let q;
    if (gameType) {
      q = query(
        matchesRef,
        where('gameType', '==', gameType),
        orderBy('timestamp', 'desc'),
        limit(count)
      );
    } else {
      q = query(
        matchesRef,
        orderBy('timestamp', 'desc'),
        limit(count)
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Firestore query failed:', error);
    return loadLocalMatches().slice(0, count);
  }
}

/**
 * Get a single match by ID.
 *
 * @param {string} matchId - Match ID
 * @returns {Promise<Object|null>} Match object or null
 */
export async function getMatch(matchId) {
  if (!isFirebaseConfigured() || !db) {
    const matches = loadLocalMatches();
    return matches.find(m => m.id === matchId) || null;
  }

  try {
    const matchRef = doc(db, MATCHES_COLLECTION, matchId);
    const snapshot = await getDoc(matchRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  } catch (error) {
    console.warn('Firestore get failed:', error);
    return null;
  }
}

/**
 * Get global match statistics.
 *
 * @returns {Promise<Object>} { chess: { total, whiteWins, blackWins, draws }, xiangqi: {...} }
 */
export async function getGlobalStats() {
  const defaultStats = {
    chess: { total: 0, whiteWins: 0, blackWins: 0, draws: 0 },
    xiangqi: { total: 0, redWins: 0, blackWins: 0, draws: 0 },
  };

  if (!isFirebaseConfigured() || !db) {
    // Calculate from local matches
    const matches = loadLocalMatches();
    for (const m of matches) {
      const gt = m.gameType || 'chess';
      if (!defaultStats[gt]) continue;
      defaultStats[gt].total++;
      if (m.result === 'white' || m.result === 'red') {
        defaultStats[gt].whiteWins = (defaultStats[gt].whiteWins || 0) + 1;
        defaultStats[gt].redWins = (defaultStats[gt].redWins || 0) + 1;
      } else if (m.result === 'black') {
        defaultStats[gt].blackWins++;
      } else {
        defaultStats[gt].draws++;
      }
    }
    return defaultStats;
  }

  try {
    const statsRef = doc(db, STATS_COLLECTION, 'matches');
    const snapshot = await getDoc(statsRef);
    if (snapshot.exists()) {
      return { ...defaultStats, ...snapshot.data() };
    }
    return defaultStats;
  } catch (error) {
    console.warn('Firestore stats fetch failed:', error);
    return defaultStats;
  }
}

// ── Internal Helpers ───────────────────────────────────────

async function updateGlobalStats(gameType, result) {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const statsRef = doc(db, STATS_COLLECTION, 'matches');
    const updates = {
      [`${gameType}.total`]: increment(1),
    };

    if (result === 'white' || result === 'red') {
      updates[`${gameType}.whiteWins`] = increment(1);
      if (gameType === 'xiangqi') {
        updates[`${gameType}.redWins`] = increment(1);
      }
    } else if (result === 'black') {
      updates[`${gameType}.blackWins`] = increment(1);
    } else {
      updates[`${gameType}.draws`] = increment(1);
    }

    await setDoc(statsRef, updates, { merge: true });
  } catch (error) {
    console.warn('Failed to update global stats:', error);
  }
}

export default {
  saveMatch,
  getUserMatches,
  getRecentMatches,
  getMatch,
  getGlobalStats,
};
