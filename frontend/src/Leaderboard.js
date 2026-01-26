import React, { Component } from "react";
import { getLeaderboard, getGameHistory } from "./GameHistory";

class Leaderboard extends Component {
  state = {
    leaderboard: [],
    recentGames: [],
    activeTab: "leaderboard", // 'leaderboard' or 'history'
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = () => {
    const leaderboard = getLeaderboard();
    const recentGames = getGameHistory().slice(0, 20);
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

  render() {
    const { leaderboard, recentGames, activeTab } = this.state;

    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2>Leaderboard & History</h2>
          <div className="tab-selector">
            <button
              className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
              onClick={() => this.setState({ activeTab: "leaderboard" })}
            >
              Leaderboard
            </button>
            <button
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => this.setState({ activeTab: "history" })}
            >
              Recent Games
            </button>
          </div>
        </div>

        {activeTab === "leaderboard" && (
          <div className="leaderboard-content">
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <p>No players yet. Play some games to appear on the leaderboard!</p>
              </div>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>W/L/D</th>
                    <th>Win Rate</th>
                    <th>Best Streak</th>
                    <th>Expert Wins</th>
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
                      <td className="player-name">{player.name}</td>
                      <td className="score">{player.score}</td>
                      <td className="record">
                        <span className="wins">{player.wins}</span>/
                        <span className="losses">{player.losses}</span>/
                        <span className="draws">{player.draws}</span>
                      </td>
                      <td className="win-rate">{player.winRate}%</td>
                      <td className="streak">{player.bestWinStreak}</td>
                      <td className="expert-wins">{player.difficultyWins[4] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="history-content">
            {recentGames.length === 0 ? (
              <div className="empty-state">
                <p>No games played yet. Start playing to see your history!</p>
              </div>
            ) : (
              <div className="games-list">
                {recentGames.map((game) => (
                  <div key={game.id} className={`game-card ${this.getResultClass(game.result)}`}>
                    <div className="game-main">
                      <span className="game-player">{game.playerName}</span>
                      <span className={`game-result ${game.result}`}>
                        {game.result === "win" ? "Won" : game.result === "loss" ? "Lost" : "Draw"}
                      </span>
                      <span className="game-opponent">
                        vs {game.opponent === "human" ? "Human" : `AI (${this.getDifficultyLabel(game.difficulty)})`}
                      </span>
                    </div>
                    <div className="game-details">
                      <span className="game-color">Playing as {game.playerColor === "w" ? "White" : "Black"}</span>
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
          Back to Game
        </button>
      </div>
    );
  }
}

export default Leaderboard;
