/**
 * Pattern Service
 *
 * Tracks and analyzes opening patterns, tactical motifs, and common positions.
 * Uses Firestore for cloud storage with localStorage fallback.
 *
 * Firestore Schema:
 *   patterns/{patternId}
 *     - gameType: 'chess' | 'xiangqi'
 *     - type: 'opening' | 'tactic' | 'endgame'
 *     - eco: string (ECO code for chess openings)
 *     - name: string (pattern name)
 *     - moves: ['e4', 'e5', ...] (move sequence)
 *     - fen: string (key position)
 *     - frequency: number (times seen)
 *     - stats: { white: wins, black: wins, draw: count }
 *     - updatedAt: serverTimestamp()
 *
 *   userPatterns/{userId}/patterns/{patternId}
 *     - patternRef: reference to patterns collection
 *     - timesPlayed: number
 *     - wins: number
 *     - losses: number
 *     - draws: number
 *     - lastPlayed: serverTimestamp()
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
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';

import { GAME_TYPE } from '../constants';

const PATTERNS_COLLECTION = 'patterns';
const USER_PATTERNS_COLLECTION = 'userPatterns';
const LOCAL_STORAGE_KEY = 'qi_arena_patterns';

// ── Common Openings Database ───────────────────────────────

// Chess openings with ECO codes
const CHESS_OPENINGS = [
  { eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { eco: 'C50', name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { eco: 'C60', name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { eco: 'D00', name: "Queen's Pawn Game", moves: ['d4', 'd5'] },
  { eco: 'D30', name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
  { eco: 'E00', name: 'Indian Defense', moves: ['d4', 'Nf6'] },
  { eco: 'A00', name: 'Irregular Opening', moves: [] },
  { eco: 'C00', name: 'French Defense', moves: ['e4', 'e6'] },
  { eco: 'B00', name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  { eco: 'C40', name: "King's Knight Opening", moves: ['e4', 'e5', 'Nf3'] },
  { eco: 'C20', name: "King's Pawn Game", moves: ['e4', 'e5'] },
  { eco: 'A40', name: "Queen's Pawn", moves: ['d4'] },
  { eco: 'A10', name: 'English Opening', moves: ['c4'] },
  { eco: 'D70', name: 'Grünfeld Defense', moves: ['d4', 'Nf6', 'c4', 'g6', 'd5'] },
  { eco: 'E60', name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'] },
];

// Xiangqi openings (simplified)
const XIANGQI_OPENINGS = [
  { name: '中炮 Central Cannon', moves: ['C2=5'] },
  { name: '仙人指路 Angel\'s Guide', moves: ['P3+1'] },
  { name: '飞相局 Flying Elephant', moves: ['E3+5'] },
  { name: '起马局 Horse Opening', moves: ['H2+3'] },
  { name: '过宫炮 Palace Cannon', moves: ['C2=4'] },
  { name: '士角炮 Advisor Cannon', moves: ['C2=6'] },
  { name: '反宫马 Counter Horse', moves: ['H8+7'] },
  { name: '屏风马 Screen Horse', moves: ['H2+3', 'H8+7'] },
  { name: '单提马 Single Horse', moves: ['H2+3', 'H8+9'] },
];

// ── Local Storage Fallback ─────────────────────────────────

function loadLocalPatterns() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalPattern(pattern) {
  const patterns = loadLocalPatterns();
  const key = generatePatternKey(pattern.gameType, pattern.moves);

  if (patterns[key]) {
    patterns[key].frequency++;
    if (pattern.result === 'white' || pattern.result === 'red') {
      patterns[key].stats.white++;
    } else if (pattern.result === 'black') {
      patterns[key].stats.black++;
    } else {
      patterns[key].stats.draw++;
    }
  } else {
    patterns[key] = {
      ...pattern,
      frequency: 1,
      stats: {
        white: pattern.result === 'white' || pattern.result === 'red' ? 1 : 0,
        black: pattern.result === 'black' ? 1 : 0,
        draw: pattern.result === 'draw' ? 1 : 0,
      },
    };
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(patterns));
  return patterns[key];
}

function generatePatternKey(gameType, moves) {
  const openingMoves = moves.slice(0, 10); // First 10 moves for key
  return `${gameType}:${openingMoves.join(',')}`;
}

// ── Public API ─────────────────────────────────────────────

/**
 * Detect the opening from a list of moves.
 *
 * @param {string} gameType - 'chess' | 'xiangqi'
 * @param {Array} moves - Array of move strings
 * @returns {Object|null} { eco, name, moves } or null
 */
export function detectOpening(gameType, moves) {
  if (!moves || moves.length === 0) return null;

  const openings = gameType === GAME_TYPE.XIANGQI ? XIANGQI_OPENINGS : CHESS_OPENINGS;

  // Find the longest matching opening
  let bestMatch = null;
  let bestLength = 0;

  for (const opening of openings) {
    if (opening.moves.length === 0) continue;

    let matches = true;
    for (let i = 0; i < opening.moves.length && i < moves.length; i++) {
      // Normalize move comparison (remove check/mate symbols, etc.)
      const gameMove = moves[i].replace(/[+#!?]/g, '');
      const openingMove = opening.moves[i].replace(/[+#!?]/g, '');
      if (gameMove !== openingMove) {
        matches = false;
        break;
      }
    }

    if (matches && opening.moves.length > bestLength) {
      bestMatch = opening;
      bestLength = opening.moves.length;
    }
  }

  return bestMatch;
}

/**
 * Record a game's opening pattern.
 *
 * @param {Object} data
 * @param {string} data.gameType - 'chess' | 'xiangqi'
 * @param {Array} data.moves - Full game moves
 * @param {string} data.result - 'white' | 'black' | 'draw'
 * @param {string} [data.userId] - User ID for personal stats
 * @returns {Promise<Object>} Recorded pattern
 */
export async function recordPattern(data) {
  const { gameType, moves, result, userId } = data;

  // Detect opening
  const opening = detectOpening(gameType, moves);
  const openingMoves = moves.slice(0, 10); // Store first 10 moves

  const pattern = {
    gameType,
    type: 'opening',
    eco: opening?.eco || null,
    name: opening?.name || 'Unknown',
    moves: openingMoves,
    result,
  };

  if (!isFirebaseConfigured() || !db) {
    return saveLocalPattern(pattern);
  }

  try {
    const key = generatePatternKey(gameType, openingMoves);
    const patternRef = doc(db, PATTERNS_COLLECTION, key);

    // Check if pattern exists
    const snapshot = await getDoc(patternRef);

    const statsField = result === 'white' || result === 'red'
      ? 'stats.white'
      : result === 'black'
        ? 'stats.black'
        : 'stats.draw';

    if (snapshot.exists()) {
      // Update existing pattern
      await setDoc(patternRef, {
        frequency: increment(1),
        [statsField]: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      // Create new pattern
      await setDoc(patternRef, {
        ...pattern,
        frequency: 1,
        stats: {
          white: result === 'white' || result === 'red' ? 1 : 0,
          black: result === 'black' ? 1 : 0,
          draw: result === 'draw' ? 1 : 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Update user-specific pattern stats
    if (userId) {
      await recordUserPattern(userId, key, result);
    }

    return { id: key, ...pattern };
  } catch (error) {
    console.warn('Firestore pattern save failed:', error);
    return saveLocalPattern(pattern);
  }
}

/**
 * Get popular openings.
 *
 * @param {string} gameType - 'chess' | 'xiangqi'
 * @param {number} [count=10] - Number of openings to fetch
 * @returns {Promise<Array>} Array of opening patterns with stats
 */
export async function getPopularOpenings(gameType, count = 10) {
  if (!isFirebaseConfigured() || !db) {
    const patterns = loadLocalPatterns();
    return Object.values(patterns)
      .filter(p => p.gameType === gameType && p.type === 'opening')
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count);
  }

  try {
    const patternsRef = collection(db, PATTERNS_COLLECTION);
    const q = query(
      patternsRef,
      where('gameType', '==', gameType),
      where('type', '==', 'opening'),
      orderBy('frequency', 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Firestore query failed:', error);
    return [];
  }
}

/**
 * Get opening statistics (win rates).
 *
 * @param {string} gameType - 'chess' | 'xiangqi'
 * @param {string} openingName - Opening name to look up
 * @returns {Promise<Object|null>} { name, frequency, winRate: { white, black, draw } }
 */
export async function getOpeningStats(gameType, openingName) {
  if (!isFirebaseConfigured() || !db) {
    const patterns = loadLocalPatterns();
    const pattern = Object.values(patterns).find(
      p => p.gameType === gameType && p.name === openingName
    );
    if (!pattern) return null;

    const total = pattern.frequency || 1;
    return {
      ...pattern,
      winRate: {
        white: (pattern.stats.white / total * 100).toFixed(1),
        black: (pattern.stats.black / total * 100).toFixed(1),
        draw: (pattern.stats.draw / total * 100).toFixed(1),
      },
    };
  }

  try {
    const patternsRef = collection(db, PATTERNS_COLLECTION);
    const q = query(
      patternsRef,
      where('gameType', '==', gameType),
      where('name', '==', openingName),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    const total = data.frequency || 1;

    return {
      id: doc.id,
      ...data,
      winRate: {
        white: (data.stats.white / total * 100).toFixed(1),
        black: (data.stats.black / total * 100).toFixed(1),
        draw: (data.stats.draw / total * 100).toFixed(1),
      },
    };
  } catch (error) {
    console.warn('Firestore query failed:', error);
    return null;
  }
}

/**
 * Get a user's most played openings.
 *
 * @param {string} userId - User ID
 * @param {string} [gameType] - Filter by game type
 * @param {number} [count=5] - Number of openings to fetch
 * @returns {Promise<Array>} Array of user pattern stats
 */
export async function getUserOpenings(userId, gameType, count = 5) {
  if (!isFirebaseConfigured() || !db) {
    return []; // No user-specific data in localStorage
  }

  try {
    const userPatternsRef = collection(db, USER_PATTERNS_COLLECTION, userId, 'patterns');
    let q = query(
      userPatternsRef,
      orderBy('timesPlayed', 'desc'),
      limit(count)
    );

    const snapshot = await getDocs(q);
    const userPatterns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Enrich with pattern data
    const enriched = await Promise.all(
      userPatterns.map(async (up) => {
        const patternRef = doc(db, PATTERNS_COLLECTION, up.patternId);
        const patternSnap = await getDoc(patternRef);
        if (patternSnap.exists()) {
          const patternData = patternSnap.data();
          if (gameType && patternData.gameType !== gameType) return null;
          return { ...up, pattern: patternData };
        }
        return null;
      })
    );

    return enriched.filter(Boolean);
  } catch (error) {
    console.warn('Firestore query failed:', error);
    return [];
  }
}

/**
 * Get all available openings for a game type.
 *
 * @param {string} gameType - 'chess' | 'xiangqi'
 * @returns {Array} Array of opening definitions
 */
export function getOpeningLibrary(gameType) {
  return gameType === GAME_TYPE.XIANGQI ? XIANGQI_OPENINGS : CHESS_OPENINGS;
}

// ── Internal Helpers ───────────────────────────────────────

async function recordUserPattern(userId, patternId, result) {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const userPatternRef = doc(db, USER_PATTERNS_COLLECTION, userId, 'patterns', patternId);

    const statsUpdate = {
      timesPlayed: increment(1),
      lastPlayed: serverTimestamp(),
    };

    if (result === 'white' || result === 'red') {
      statsUpdate.wins = increment(1);
    } else if (result === 'black') {
      statsUpdate.losses = increment(1);
    } else {
      statsUpdate.draws = increment(1);
    }

    await setDoc(userPatternRef, {
      patternId,
      ...statsUpdate,
    }, { merge: true });
  } catch (error) {
    console.warn('Failed to record user pattern:', error);
  }
}

export default {
  detectOpening,
  recordPattern,
  getPopularOpenings,
  getOpeningStats,
  getUserOpenings,
  getOpeningLibrary,
};
