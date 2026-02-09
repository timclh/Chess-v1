/**
 * HomePage - Unified Landing Page
 * Choose between International Chess and Chinese Chess (Xiangqi)
 */

import React, { Component } from 'react';

class HomePage extends Component {
  render() {
    const { onNavigate } = this.props;

    return (
      <div className="home-page">
        {/* Hero Section */}
        <div className="home-hero">
          <h2 className="home-tagline">Master Two Ancient Games of Strategy</h2>
          <p className="home-description">
            Play, learn, and compete in Chess, Chinese Chess, and Gomoku — 
            powered by grandmaster-level AI coaching
          </p>
        </div>

        {/* Game Selection Cards */}
        <div className="home-cards">
          {/* Chess Card */}
          <div 
            className="game-card chess-card" 
            onClick={() => onNavigate('game')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate('game')}
          >
            <div className="card-icon">
              <div className="chess-piece-display">
                <span className="piece-symbol">♚</span>
                <span className="piece-symbol piece-white">♔</span>
              </div>
            </div>
            <h3 className="card-title">Chess</h3>
            <p className="card-subtitle">International Chess</p>
            <p className="card-desc">
              The classic game of kings. Challenge AI opponents from beginner to grandmaster level.
            </p>
            <div className="card-features">
              <span className="feature-tag">🤖 AI Opponent</span>
              <span className="feature-tag">🎓 10 Lessons</span>
              <span className="feature-tag">🧩 Puzzles</span>
              <span className="feature-tag">📖 Openings</span>
            </div>
            <button className="card-play-btn chess-play-btn">
              Play Chess →
            </button>
          </div>

          {/* Xiangqi Card */}
          <div 
            className="game-card xiangqi-card"
            onClick={() => onNavigate('xiangqi')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate('xiangqi')}
          >
            <div className="card-icon">
              <div className="xiangqi-piece-display">
                <span className="piece-char red-piece">將</span>
                <span className="piece-char black-piece">帥</span>
              </div>
            </div>
            <h3 className="card-title">象棋</h3>
            <p className="card-subtitle">Chinese Chess · Xiangqi</p>
            <p className="card-desc">
              The art of war on the board. Master ancient strategies with Fairy-Stockfish engine coaching.
            </p>
            <div className="card-features">
              <span className="feature-tag">🤖 AI Coach</span>
              <span className="feature-tag">🎓 Tutorials</span>
              <span className="feature-tag">🏆 7 Levels</span>
              <span className="feature-tag">📊 Analysis</span>
            </div>
            <button className="card-play-btn xiangqi-play-btn">
              Play 象棋 →
            </button>
          </div>

          {/* WuziQi Card */}
          <div 
            className="game-card wuziqi-card"
            onClick={() => onNavigate('wuziqi')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate('wuziqi')}
          >
            <div className="card-icon">
              <div className="wuziqi-piece-display">
                <span className="piece-symbol">⚫</span>
                <span className="piece-symbol">⚪</span>
              </div>
            </div>
            <h3 className="card-title">五子棋</h3>
            <p className="card-subtitle">Gomoku · Five in a Row</p>
            <p className="card-desc">
              Connect five stones in a row on a 15×15 board. Simple to learn, deeply strategic.
            </p>
            <div className="card-features">
              <span className="feature-tag">🤖 AI Opponent</span>
              <span className="feature-tag">🎯 4 Levels</span>
              <span className="feature-tag">📊 Analysis</span>
              <span className="feature-tag">🏆 ELO Rating</span>
            </div>
            <button className="card-play-btn wuziqi-play-btn">
              Play 五子棋 →
            </button>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="home-quick-access">
          <h3 className="quick-title">Quick Access</h3>
          <div className="quick-links">
            <button className="quick-link-btn" onClick={() => onNavigate('puzzles')}>
              <span className="quick-icon">🧩</span>
              <span className="quick-label">Puzzles</span>
            </button>
            <button className="quick-link-btn" onClick={() => onNavigate('learn')}>
              <span className="quick-icon">📺</span>
              <span className="quick-label">Learn</span>
            </button>
            <button className="quick-link-btn" onClick={() => onNavigate('coach')}>
              <span className="quick-icon">🤖</span>
              <span className="quick-label">AI Coach</span>
            </button>
            <button className="quick-link-btn" onClick={() => onNavigate('openings')}>
              <span className="quick-icon">📖</span>
              <span className="quick-label">Openings</span>
            </button>
            <button className="quick-link-btn" onClick={() => onNavigate('multiplayer')}>
              <span className="quick-icon">🌐</span>
              <span className="quick-label">Online</span>
            </button>
            <button className="quick-link-btn" onClick={() => onNavigate('leaderboard')}>
              <span className="quick-icon">🏆</span>
              <span className="quick-label">Leaderboard</span>
            </button>
            <button className="quick-link-btn" onClick={() => onNavigate('profile')}>
              <span className="quick-icon">👤</span>
              <span className="quick-label">Social</span>
            </button>
            <button className="quick-link-btn" onClick={() => onNavigate('wuziqi')}>
              <span className="quick-icon">⚫</span>
              <span className="quick-label">Gomoku</span>
            </button>
          </div>
        </div>

        {/* Stats / About Section */}
        <div className="home-stats">
          <div className="stat-item">
            <span className="stat-number">3</span>
            <span className="stat-label">Board Games</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">14+</span>
            <span className="stat-label">Tutorial Lessons</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">GM</span>
            <span className="stat-label">Level AI Engines</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">∞</span>
            <span className="stat-label">Games to Play</span>
          </div>
        </div>
      </div>
    );
  }
}

export default HomePage;
