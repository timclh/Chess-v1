import React, { Component } from "react";
import { getLeaderboard, getGameHistory } from "./GameHistory";

class Leaderboard extends Component {
  state = {
    leaderboard: [],
    recentGames: [],
    activeTab: "leaderboard", // 'leaderboard', 'ai-games', 'human-games'
    historyFilter: "all", // 'all', 'ai', 'human'
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = () => {
    const leaderboard = getLeaderboard();
    const recentGames = getGameHistory().slice(0, 50);
    this.setState({ leaderboard, recentGames });
  };

  formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  getDifficultyLabel = (level) => {
    const labels = { 1: "Easy", 2: "Medium", 3: "Hard", 4: "Expert" };
    return labels[level] || "Unknown";
  };

  getPointsLabel = (game) => {
    if (game.result === 'win') {
      if (game.opponent === 'human') return '+5';
      const points = { 1: '+1', 2: '+2', 3: '+3', 4: '+5' };
      return points[game.difficulty] || '+2';
    } else if (game.result === 'draw') {
      if (game.opponent === 'human') return '+2.5';
      const points = { 1: '+0.5', 2: '+1', 3: '+1.5', 4: '+2.5' };
      return points[game.difficulty] || '+1';
    }
    return '0';
  };

  getResultClass = (result) => {
    if (result === "win") return "result-win";
    if (result === "loss") return "result-loss";
    return "result-draw";
  };

  getRankBadge = (index) => {
    if (index === 0) return "rank-gold";
    if (index === 1) return "rank-silver";
    if (index === 2) return "rank-bronze";
    return "";
  };

  getFilteredGames = () => {
    const { recentGames, historyFilter } = this.state;
    if (historyFilter === 'ai') {
      return recentGames.filter(g => g.opponent !== 'human');
    }
    if (historyFilter === 'human') {
      return recentGames.filter(g => g.opponent === 'human');
    }
    return recentGames;
  };

  render() {
    const { leaderboard, activeTab, historyFilter } = this.state;
    const filteredGames = this.getFilteredGames();

    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2>🏆 Leaderboard & History</h2>
          <div className="tab-selector">
            <button
              className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
              onClick={() => this.setState({ activeTab: "leaderboard" })}
            >
              排行榜 Leaderboard
            </button>
            <button
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => this.setState({ activeTab: "history" })}
            >
              历史记录 History
            </button>
          </div>
        </div>

        {/* Scoring Rules */}
        <div className="scoring-rules">
          <div className="rule-title">积分规则 / Scoring Rules:</div>
          <div className="rules-grid">
            <span>🤖 AI Easy: +1</span>
            <span>🤖 AI Medium: +2</span>
            <span>🤖 AI Hard: +3</span>
            <span>🤖 AI Expert: +5</span>
            <span>👥 Human Win: +5</span>
            <span>🤝 Draw: Half points</span>
          </div>
        </div>

        {activeTab === "leaderboard" && (
          <div className="leaderboard-content">
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <p>暂无玩家。开始游戏后即可上榜！</p>
                <p>No players yet. Play some games to appear on the leaderboard!</p>
              </div>
            ) : (
              <>
                {/* Top 3 Showcase */}
                <div className="top-players">
                  {leaderboard.slice(0, 3).map((player, index) => (
                    <div key={player.name} className={`top-player rank-${index + 1}`}>
                      <div className="top-rank-icon">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                      </div>
                      <div className="top-player-name">{player.name}</div>
                      {player.rankTitle && (
                        <div className="rank-title" style={{ color: player.rankColor }}>
                          {player.rankTitle}
                          <span className="rank-title-en">{player.rankTitleEn}</span>
                        </div>
                      )}
                      <div className="top-player-score">{player.score} pts</div>
                      <div className="top-player-stats">
                        <span title="vs AI">🤖 {player.aiStats?.wins || 0}W</span>
                        <span title="vs Human">👥 {player.humanStats?.wins || 0}W</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Full Table */}
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Score</th>
                      <th>vs AI</th>
                      <th>vs Human</th>
                      <th>Win%</th>
                      <th>Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, index) => (
                      <tr key={player.name} className={this.getRankBadge(index)}>
                        <td className="rank-cell">
                          {index < 3 ? (
                            <span className={`rank-icon ${this.getRankBadge(index)}`}>
                              {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                            </span>
                          ) : (
                            <span className="rank-number">{index + 1}</span>
                          )}
                        </td>
                        <td className="player-name">
                          {player.name}
                          {player.rankTitle && (
                            <span className="player-title" style={{ color: player.rankColor }}>
                              {player.rankTitle}
                            </span>
                          )}
                        </td>
                        <td className="score">{player.score}</td>
                        <td className="ai-record">
                          <span className="wins">{player.aiStats?.wins || 0}</span>/
                          <span className="losses">{player.aiStats?.losses || 0}</span>/
                          <span className="draws">{player.aiStats?.draws || 0}</span>
                        </td>
                        <td className="human-record">
                          <span className="wins">{player.humanStats?.wins || 0}</span>/
                          <span className="losses">{player.humanStats?.losses || 0}</span>/
                          <span className="draws">{player.humanStats?.draws || 0}</span>
                        </td>
                        <td className="win-rate">{player.winRate}%</td>
                        <td className="streak">{player.bestWinStreak > 0 ? `${player.bestWinStreak}🔥` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="history-content">
            {/* Filter buttons */}
            <div className="history-filter">
              <button
                className={`filter-btn ${historyFilter === 'all' ? 'active' : ''}`}
                onClick={() => this.setState({ historyFilter: 'all' })}
              >
                All Games
              </button>
              <button
                className={`filter-btn ${historyFilter === 'ai' ? 'active' : ''}`}
                onClick={() => this.setState({ historyFilter: 'ai' })}
              >
                🤖 vs AI
              </button>
              <button
                className={`filter-btn ${historyFilter === 'human' ? 'active' : ''}`}
                onClick={() => this.setState({ historyFilter: 'human' })}
              >
                👥 vs Human
              </button>
            </div>

            {filteredGames.length === 0 ? (
              <div className="empty-state">
                <p>暂无游戏记录</p>
                <p>No games played yet. Start playing to see your history!</p>
              </div>
            ) : (
              <div className="games-list">
                {filteredGames.map((game) => (
                  <div key={game.id} className={`game-card ${this.getResultClass(game.result)}`}>
                    <div className="game-main">
                      <span className="game-player">{game.playerName}</span>
                      <span className={`game-result ${game.result}`}>
                        {game.result === "win" ? "Won" : game.result === "loss" ? "Lost" : "Draw"}
                      </span>
                      <span className="game-opponent">
                        vs {game.opponent === "human" ? "👥 Human" : `🤖 AI (${this.getDifficultyLabel(game.difficulty)})`}
                      </span>
                      <span className={`game-points ${game.result}`}>
                        {this.getPointsLabel(game)}
                      </span>
                    </div>
                    <div className="game-details">
                      <span className="game-color">
                        {game.playerColor === "w" ? "⬜" : "⬛"} {game.playerColor === "w" ? "White" : "Black"}
                      </span>
                      <span className="game-moves">{game.moves} moves</span>
                      <span className="game-date">{this.formatDate(game.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button className="back-btn" onClick={this.props.onBack}>
          ← Back to Game
        </button>
      </div>
    );
  }
}

export default Leaderboard;
