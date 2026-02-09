/**
 * Social Service
 * 
 * Handles social features:
 * - Share game results (Web Share API with clipboard fallback)
 * - Friend system (Firebase Firestore backed, localStorage fallback)
 * - Activity feed
 * - Game challenges
 */

import {
  db,
  auth,
  isFirebaseConfigured,
} from '../firebase';

// ─── Share Game Results ─────────────────────────────────────────────────

/**
 * Share a game result using the Web Share API (mobile) or clipboard (desktop)
 * @param {Object} opts
 * @param {string} opts.result - 'win' | 'loss' | 'draw'
 * @param {string} opts.opponent - opponent name
 * @param {string} opts.gameType - 'chess' | 'xiangqi'
 * @param {number} opts.moves - number of moves
 * @param {number} [opts.ratingDelta] - rating change
 * @returns {Promise<{method: string}>} how it was shared
 */
export async function shareGameResult({ result, opponent, gameType, moves, ratingDelta }) {
  const emoji = result === 'win' ? '🏆' : result === 'draw' ? '🤝' : '📉';
  const resultText = result === 'win' ? 'Won' : result === 'draw' ? 'Drew' : 'Lost';
  const gameEmoji = gameType === 'xiangqi' ? '象棋' : '♟️';
  const ratingStr = ratingDelta ? ` (${ratingDelta > 0 ? '+' : ''}${ratingDelta})` : '';

  const text = `${emoji} ${resultText} a ${gameEmoji} ${gameType === 'xiangqi' ? 'Xiangqi' : 'Chess'} game vs ${opponent} in ${moves} moves${ratingStr}!\n\nPlay at 棋 Arena`;
  const url = window.location.origin;

  // Try Web Share API first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title: '棋 Arena — Game Result', text, url });
      return { method: 'share-api' };
    } catch (e) {
      if (e.name === 'AbortError') return { method: 'cancelled' };
      // Fallthrough to clipboard
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return { method: 'clipboard' };
  } catch (e) {
    // Final fallback: prompt
    const textarea = document.createElement('textarea');
    textarea.value = `${text}\n${url}`;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return { method: 'clipboard-fallback' };
  }
}

/**
 * Share a puzzle achievement
 */
export async function sharePuzzleResult({ puzzleId, solved, attempts, rating }) {
  const emoji = solved ? '✅' : '❌';
  const text = `${emoji} ${solved ? 'Solved' : 'Attempted'} Puzzle #${puzzleId} on 棋 Arena!\n${solved ? `Rating: ${rating}` : `${attempts} attempts`}`;
  const url = window.location.origin + '#/puzzles';

  if (navigator.share) {
    try {
      await navigator.share({ title: '棋 Arena — Puzzle', text, url });
      return { method: 'share-api' };
    } catch (e) {
      if (e.name === 'AbortError') return { method: 'cancelled' };
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return { method: 'clipboard' };
  } catch {
    return { method: 'failed' };
  }
}

// ─── Friend System (localStorage-based, upgradable to Firebase) ─────────

const FRIENDS_KEY = 'chess_arena_friends';
const ACTIVITY_KEY = 'chess_arena_activity';

function getFriendsList() {
  try {
    const data = localStorage.getItem(FRIENDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveFriendsList(friends) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

/**
 * Add a friend by display name or ID
 */
export function addFriend(friendId, displayName) {
  const friends = getFriendsList();
  if (friends.some(f => f.id === friendId)) {
    return { success: false, reason: 'already_friends' };
  }
  friends.push({
    id: friendId,
    displayName: displayName || friendId,
    addedAt: new Date().toISOString(),
    online: false,
  });
  saveFriendsList(friends);
  addActivity({ type: 'friend_added', friendId, displayName });
  return { success: true };
}

/**
 * Remove a friend
 */
export function removeFriend(friendId) {
  const friends = getFriendsList().filter(f => f.id !== friendId);
  saveFriendsList(friends);
  return { success: true };
}

/**
 * Get friends list
 */
export function getFriends() {
  return getFriendsList();
}

/**
 * Search for users (stub — returns empty when Firebase isn't configured)
 */
export async function searchUsers(query) {
  if (!isFirebaseConfigured() || !db) {
    return []; // Can only search with Firebase
  }
  // Firebase user search would go here
  // For now, return empty — users can add friends by ID
  return [];
}

// ─── Activity Feed ──────────────────────────────────────────────────────

function getActivityFeed() {
  try {
    const data = localStorage.getItem(ACTIVITY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveActivityFeed(feed) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(feed));
}

/**
 * Add an activity to the feed
 */
export function addActivity(activity) {
  const feed = getActivityFeed();
  feed.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...activity,
  });
  // Keep last 50 activities
  if (feed.length > 50) feed.length = 50;
  saveActivityFeed(feed);
  return feed;
}

/**
 * Get activity feed
 */
export function getActivity(limit = 20) {
  return getActivityFeed().slice(0, limit);
}

/**
 * Record a game result as an activity
 */
export function recordGameActivity({ result, opponent, gameType, moves, ratingDelta }) {
  return addActivity({
    type: 'game_result',
    result,
    opponent,
    gameType,
    moves,
    ratingDelta,
  });
}

/**
 * Record a puzzle completion as an activity
 */
export function recordPuzzleActivity({ puzzleId, solved, rating }) {
  return addActivity({
    type: 'puzzle_completed',
    puzzleId,
    solved,
    rating,
  });
}

/**
 * Record a streak milestone
 */
export function recordStreakActivity(streak) {
  return addActivity({
    type: 'streak_milestone',
    streak,
  });
}

// ─── Challenge System ───────────────────────────────────────────────────

const CHALLENGES_KEY = 'chess_arena_challenges';

function getChallengesList() {
  try {
    const data = localStorage.getItem(CHALLENGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Create a challenge link that can be shared
 */
export function createChallenge({ gameType = 'chess', timeControl = '10+0', color = 'random' }) {
  const challengeId = Math.random().toString(36).substring(2, 10);
  const challenge = {
    id: challengeId,
    gameType,
    timeControl,
    color,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const challenges = getChallengesList();
  challenges.unshift(challenge);
  if (challenges.length > 10) challenges.length = 10;
  localStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));

  // Create a shareable URL
  const url = `${window.location.origin}#/multiplayer?challenge=${challengeId}`;
  return { challenge, url };
}

/**
 * Get pending challenges
 */
export function getPendingChallenges() {
  return getChallengesList().filter(c => c.status === 'pending');
}

/**
 * Format an activity for display
 */
export function formatActivity(activity) {
  const time = new Date(activity.timestamp);
  const timeStr = time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  switch (activity.type) {
    case 'game_result': {
      const emoji = activity.result === 'win' ? '🏆' : activity.result === 'draw' ? '🤝' : '📉';
      const gameIcon = activity.gameType === 'xiangqi' ? '象棋' : '♟️';
      const resultText = activity.result === 'win' ? 'Won' : activity.result === 'draw' ? 'Drew' : 'Lost';
      const delta = activity.ratingDelta ? ` (${activity.ratingDelta > 0 ? '+' : ''}${activity.ratingDelta})` : '';
      return { emoji, text: `${resultText} ${gameIcon} vs ${activity.opponent} in ${activity.moves} moves${delta}`, time: timeStr };
    }
    case 'puzzle_completed': {
      const emoji = activity.solved ? '🧩' : '❌';
      return { emoji, text: `${activity.solved ? 'Solved' : 'Attempted'} Puzzle #${activity.puzzleId}`, time: timeStr };
    }
    case 'streak_milestone':
      return { emoji: '🔥', text: `${activity.streak}-day puzzle streak!`, time: timeStr };
    case 'friend_added':
      return { emoji: '👋', text: `Added ${activity.displayName} as friend`, time: timeStr };
    default:
      return { emoji: '📌', text: 'Activity', time: timeStr };
  }
}
