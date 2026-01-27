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
const SAVED_GAME_KEY = 'chess_saved_game';

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

// Point values for scoring
const POINTS = {
  aiWin: { 1: 1, 2: 2, 3: 3, 4: 5 }, // Easy: 1, Medium: 2, Hard: 3, Expert: 5
  aiDraw: { 1: 0.5, 2: 1, 3: 1.5, 4: 2.5 }, // Half points for draw
  humanWin: 5,
  humanDraw: 2.5,
};

// Calculate points for a game result
function calculatePoints(gameRecord) {
  const isHuman = gameRecord.opponent === 'human';
  const difficulty = gameRecord.difficulty || 2;

  if (gameRecord.result === 'win') {
    return isHuman ? POINTS.humanWin : (POINTS.aiWin[difficulty] || 2);
  } else if (gameRecord.result === 'draw') {
    return isHuman ? POINTS.humanDraw : (POINTS.aiDraw[difficulty] || 1);
  }
  return 0;
}

// Update player statistics (local)
function updatePlayerStats(gameRecord) {
  try {
    const players = getPlayers();
    const name = gameRecord.playerName;
    const isHuman = gameRecord.opponent === 'human';

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
        score: 0,
        difficultyWins: { 1: 0, 2: 0, 3: 0, 4: 0 },
        // Separate stats for AI and Human
        aiStats: { wins: 0, losses: 0, draws: 0, games: 0 },
        humanStats: { wins: 0, losses: 0, draws: 0, games: 0 },
      };
    }

    const player = players[name];
    player.gamesPlayed++;
    player.lastPlayed = gameRecord.timestamp;

    // Initialize if missing (for existing players)
    if (!player.aiStats) player.aiStats = { wins: 0, losses: 0, draws: 0, games: 0 };
    if (!player.humanStats) player.humanStats = { wins: 0, losses: 0, draws: 0, games: 0 };
    if (!player.score) player.score = 0;

    // Update category-specific stats
    const categoryStats = isHuman ? player.humanStats : player.aiStats;
    categoryStats.games++;

    if (gameRecord.result === 'win') {
      player.wins++;
      categoryStats.wins++;
      player.winStreak++;
      if (player.winStreak > player.bestWinStreak) {
        player.bestWinStreak = player.winStreak;
      }
      if (!isHuman && gameRecord.difficulty) {
        player.difficultyWins[gameRecord.difficulty] =
          (player.difficultyWins[gameRecord.difficulty] || 0) + 1;
      }
    } else if (gameRecord.result === 'loss') {
      player.losses++;
      categoryStats.losses++;
      player.winStreak = 0;
    } else {
      player.draws++;
      categoryStats.draws++;
      player.winStreak = 0;
    }

    // Calculate new score
    player.score = (player.score || 0) + calculatePoints(gameRecord);

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

// Rank titles for top players
const RANK_TITLES = [
  { rank: 1, title: "黄金战神", titleEn: "Golden Warlord", color: "#FFD700" },
  { rank: 2, title: "白银圣手", titleEn: "Silver Grandmaster", color: "#C0C0C0" },
  { rank: 3, title: "青铜智者", titleEn: "Bronze Sage", color: "#CD7F32" },
];

// Get rank title for a position
export function getRankTitle(position) {
  return RANK_TITLES.find(t => t.rank === position) || null;
}

// Get leaderboard (local, or cloud if configured)
export function getLeaderboard() {
  const players = getPlayers();
  const leaderboard = Object.values(players).map(player => {
    // Use stored score, or calculate if missing (backwards compatibility)
    const score = player.score || (player.wins * 3 + player.draws);

    return {
      ...player,
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      winRate: player.gamesPlayed > 0
        ? Math.round((player.wins / player.gamesPlayed) * 100)
        : 0,
      aiStats: player.aiStats || { wins: 0, losses: 0, draws: 0, games: 0 },
      humanStats: player.humanStats || { wins: 0, losses: 0, draws: 0, games: 0 },
    };
  });

  leaderboard.sort((a, b) => b.score - a.score);

  // Add rank titles
  leaderboard.forEach((player, index) => {
    const rankTitle = getRankTitle(index + 1);
    if (rankTitle) {
      player.rankTitle = rankTitle.title;
      player.rankTitleEn = rankTitle.titleEn;
      player.rankColor = rankTitle.color;
    }
  });

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

// Save game state (mid-game progress)
export function saveGameState(gameState) {
  try {
    const saveData = {
      fen: gameState.fen,
      history: gameState.history,
      gameMode: gameState.gameMode,
      playerColor: gameState.playerColor,
      aiDifficulty: gameState.aiDifficulty,
      playerName: gameState.playerName,
      gameStartTime: gameState.gameStartTime,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Error saving game state:', e);
    return false;
  }
}

// Load saved game state
export function loadGameState() {
  try {
    const data = localStorage.getItem(SAVED_GAME_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error loading game state:', e);
    return null;
  }
}

// Check if there's a saved game
export function hasSavedGame() {
  return localStorage.getItem(SAVED_GAME_KEY) !== null;
}

// Delete saved game
export function deleteSavedGame() {
  localStorage.removeItem(SAVED_GAME_KEY);
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
  saveGameState,
  loadGameState,
  hasSavedGame,
  deleteSavedGame,
};
