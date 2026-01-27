// Game History Manager - Uses localStorage + optional Firebase cloud storage

import {
  saveGameToCloud,
  getUserGames,
  updateUserStats,
  getLeaderboardFromCloud,
  getUserProfile,
  saveUserProfile,
  isFirebaseConfigured
} from './firebase';

const STORAGE_KEY = 'chess_game_history';
const PLAYERS_KEY = 'chess_players';

// Get all game history (local)
export function getGameHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading game history:', e);
    return [];
  }
}

// Get game history from cloud (if logged in)
export async function getGameHistoryCloud(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return getGameHistory();
  }
  try {
    const cloudGames = await getUserGames(userId, 50);
    return cloudGames;
  } catch (e) {
    console.error('Error reading cloud game history:', e);
    return getGameHistory();
  }
}

// Save a game result (local + cloud if logged in)
export async function saveGameResult(result, userId = null) {
  try {
    const gameRecord = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      playerName: result.playerName || 'Anonymous',
      playerColor: result.playerColor,
      opponent: result.opponent,
      difficulty: result.difficulty,
      result: result.result,
      moves: result.moves,
      duration: result.duration,
    };

    // Always save locally
    const history = getGameHistory();
    history.unshift(gameRecord);
    if (history.length > 100) {
      history.pop();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    updatePlayerStats(gameRecord);

    // Save to cloud if logged in
    if (isFirebaseConfigured() && userId) {
      try {
        await saveGameToCloud(userId, gameRecord);
        await updateCloudStats(userId, gameRecord);
      } catch (cloudError) {
        console.error('Cloud save error:', cloudError);
      }
    }

    return gameRecord;
  } catch (e) {
    console.error('Error saving game result:', e);
    return null;
  }
}

// Get all players (local)
export function getPlayers() {
  try {
    const data = localStorage.getItem(PLAYERS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Error reading players:', e);
    return {};
  }
}

// Update player statistics (local)
function updatePlayerStats(gameRecord) {
  try {
    const players = getPlayers();
    const name = gameRecord.playerName;

    if (!players[name]) {
      players[name] = {
        name,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        winStreak: 0,
        bestWinStreak: 0,
        lastPlayed: null,
        difficultyWins: { 1: 0, 2: 0, 3: 0, 4: 0 },
      };
    }

    const player = players[name];
    player.gamesPlayed++;
    player.lastPlayed = gameRecord.timestamp;

    if (gameRecord.result === 'win') {
      player.wins++;
      player.winStreak++;
      if (player.winStreak > player.bestWinStreak) {
        player.bestWinStreak = player.winStreak;
      }
      if (gameRecord.difficulty && gameRecord.opponent !== 'human') {
        player.difficultyWins[gameRecord.difficulty] =
          (player.difficultyWins[gameRecord.difficulty] || 0) + 1;
      }
    } else if (gameRecord.result === 'loss') {
      player.losses++;
      player.winStreak = 0;
    } else {
      player.draws++;
      player.winStreak = 0;
    }

    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch (e) {
    console.error('Error updating player stats:', e);
  }
}

// Update cloud stats
async function updateCloudStats(userId, gameRecord) {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return;

    const stats = profile.stats || {
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      winStreak: 0,
      bestWinStreak: 0,
      difficultyWins: { 1: 0, 2: 0, 3: 0, 4: 0 },
    };

    stats.gamesPlayed++;

    if (gameRecord.result === 'win') {
      stats.wins++;
      stats.winStreak = (stats.winStreak || 0) + 1;
      if (stats.winStreak > (stats.bestWinStreak || 0)) {
        stats.bestWinStreak = stats.winStreak;
      }
      if (gameRecord.difficulty && gameRecord.opponent !== 'human') {
        if (!stats.difficultyWins) stats.difficultyWins = {};
        stats.difficultyWins[gameRecord.difficulty] =
          (stats.difficultyWins[gameRecord.difficulty] || 0) + 1;
      }
    } else if (gameRecord.result === 'loss') {
      stats.losses++;
      stats.winStreak = 0;
    } else {
      stats.draws++;
      stats.winStreak = 0;
    }

    // Calculate score
    const baseScore = stats.wins * 3 + stats.draws;
    const difficultyBonus =
      ((stats.difficultyWins && stats.difficultyWins[3]) || 0) * 2 +
      ((stats.difficultyWins && stats.difficultyWins[4]) || 0) * 5;
    stats.score = baseScore + difficultyBonus;

    await updateUserStats(userId, stats);
  } catch (e) {
    console.error('Error updating cloud stats:', e);
  }
}

// Get leaderboard (local, or cloud if configured)
export function getLeaderboard() {
  const players = getPlayers();
  const leaderboard = Object.values(players).map(player => {
    const baseScore = player.wins * 3 + player.draws;
    const difficultyBonus =
      (player.difficultyWins[3] || 0) * 2 +
      (player.difficultyWins[4] || 0) * 5;
    const score = baseScore + difficultyBonus;

    return {
      ...player,
      score,
      winRate: player.gamesPlayed > 0
        ? Math.round((player.wins / player.gamesPlayed) * 100)
        : 0,
    };
  });

  leaderboard.sort((a, b) => b.score - a.score);
  return leaderboard;
}

// Get cloud leaderboard
export async function getLeaderboardCloud() {
  if (!isFirebaseConfigured()) {
    return getLeaderboard();
  }
  try {
    const cloudUsers = await getLeaderboardFromCloud(50);
    return cloudUsers.map(user => ({
      name: user.displayName || user.email,
      ...user.stats,
      winRate: user.stats && user.stats.gamesPlayed > 0
        ? Math.round((user.stats.wins / user.stats.gamesPlayed) * 100)
        : 0,
    }));
  } catch (e) {
    console.error('Error getting cloud leaderboard:', e);
    return getLeaderboard();
  }
}

// Get player by name
export function getPlayer(name) {
  const players = getPlayers();
  return players[name] || null;
}

// Clear all data (for testing)
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PLAYERS_KEY);
}

// Get recent games for a player
export function getPlayerGames(playerName, limit = 10) {
  const history = getGameHistory();
  return history
    .filter(game => game.playerName === playerName)
    .slice(0, limit);
}

export default {
  getGameHistory,
  getGameHistoryCloud,
  saveGameResult,
  getPlayers,
  getLeaderboard,
  getLeaderboardCloud,
  getPlayer,
  getPlayerGames,
  clearAllData,
};
