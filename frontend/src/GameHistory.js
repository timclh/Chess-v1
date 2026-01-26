// Game History Manager - Uses localStorage for persistence

const STORAGE_KEY = 'chess_game_history';
const PLAYERS_KEY = 'chess_players';

// Get all game history
export function getGameHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading game history:', e);
    return [];
  }
}

// Save a game result
export function saveGameResult(result) {
  try {
    const history = getGameHistory();
    const gameRecord = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      playerName: result.playerName || 'Anonymous',
      playerColor: result.playerColor,
      opponent: result.opponent, // 'human', 'ai', 'coach'
      difficulty: result.difficulty,
      result: result.result, // 'win', 'loss', 'draw'
      moves: result.moves,
      duration: result.duration,
    };
    history.unshift(gameRecord); // Add to beginning
    // Keep only last 100 games
    if (history.length > 100) {
      history.pop();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

    // Update player stats
    updatePlayerStats(gameRecord);

    return gameRecord;
  } catch (e) {
    console.error('Error saving game result:', e);
    return null;
  }
}

// Get all players
export function getPlayers() {
  try {
    const data = localStorage.getItem(PLAYERS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Error reading players:', e);
    return {};
  }
}

// Update player statistics
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
      // Track wins by difficulty
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

// Get leaderboard (sorted by score)
export function getLeaderboard() {
  const players = getPlayers();
  const leaderboard = Object.values(players).map(player => {
    // Calculate score: wins * 3 + draws * 1, bonus for higher difficulty wins
    const baseScore = player.wins * 3 + player.draws;
    const difficultyBonus =
      (player.difficultyWins[3] || 0) * 2 + // Hard wins +2
      (player.difficultyWins[4] || 0) * 5;  // Expert wins +5
    const score = baseScore + difficultyBonus;

    return {
      ...player,
      score,
      winRate: player.gamesPlayed > 0
        ? Math.round((player.wins / player.gamesPlayed) * 100)
        : 0,
    };
  });

  // Sort by score descending
  leaderboard.sort((a, b) => b.score - a.score);

  return leaderboard;
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
  saveGameResult,
  getPlayers,
  getLeaderboard,
  getPlayer,
  getPlayerGames,
  clearAllData,
};
