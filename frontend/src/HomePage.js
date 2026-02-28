/**
 * HomePage - Unified Landing Page
 * Choose between International Chess and Chinese Chess (Xiangqi)
 */

import React, { Component } from 'react';
import { getStreak, isTodayCompleted } from './services/DailyPuzzleService';
import { getRating } from './services/UserRatingService';
import { getAvailable } from './services/ViewportService';
import { GAME_TYPE } from './constants';

class HomePage extends Component {
  state = { gap: 14 };

  componentDidMount() {
    this._recalc();
    this._onResize = () => this._recalc();
    window.addEventListener('resize', this._onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  _recalc() {
    // Measure available height, subtract fixed content heights, distribute as gaps
    const { height } = getAvailable();
    // Fixed content heights (approximate):
    // game cards row: 110, daily banner: 56, feature grid: 170, stats: 50
    const contentHeight = 110 + 56 + 170 + 50;
    const sections = 4; // number of gaps between sections
    const gap = Math.max(8, Math.floor((height - contentHeight) / sections));
    this.setState({ gap: Math.min(gap, 40) }); // cap at 40px max
  }

  render() {
    const { onNavigate } = this.props;
    const { gap } = this.state;
    const streak = getStreak();
    const todayDone = isTodayCompleted();
    const chessRating = getRating(GAME_TYPE.CHESS).rating || 1200;
    const xiangqiRating = getRating(GAME_TYPE.XIANGQI).rating || 1200;

    return (
      <div className="home-page" style={{ gap: `${gap}px` }}>
        {/* Game Selection - big tappable cards */}
        <div className="home-games">
          <div className="home-game-card hgc-chess" onClick={() => onNavigate('game')}>
            <div className="hgc-pieces">♚♔</div>
            <div className="hgc-info">
              <span className="hgc-title">Chess</span>
              <span className="hgc-rating">ELO {chessRating}</span>
            </div>
          </div>
          <div className="home-game-card hgc-xiangqi" onClick={() => onNavigate('xiangqi')}>
            <div className="hgc-pieces"><span className="hgc-char r">將</span><span className="hgc-char b">帥</span></div>
            <div className="hgc-info">
              <span className="hgc-title">象棋</span>
              <span className="hgc-rating">ELO {xiangqiRating}</span>
            </div>
          </div>
          <div className="home-game-card hgc-gomoku" onClick={() => onNavigate('wuziqi')}>
            <div className="hgc-pieces">⚫⚪</div>
            <div className="hgc-info">
              <span className="hgc-title">五子棋</span>
              <span className="hgc-sub">Gomoku</span>
            </div>
          </div>
        </div>

        {/* Daily Challenge Banner */}
        <div className="home-daily" onClick={() => onNavigate('puzzles')}>
          <div className="daily-left">
            <span className="daily-icon">{todayDone ? '✅' : '🧩'}</span>
            <div className="daily-text">
              <span className="daily-title">{todayDone ? 'Puzzle Complete!' : 'Daily Puzzle'}</span>
              <span className="daily-sub">{todayDone ? 'Come back tomorrow' : 'Solve today\'s challenge'}</span>
            </div>
          </div>
          <div className="daily-streak">
            <span className="streak-num">🔥 {streak.current}</span>
            <span className="streak-label">streak</span>
          </div>
        </div>

        {/* Feature Grid - 2x4 */}
        <div className="home-features">
          <button className="home-feat" onClick={() => onNavigate('puzzles')}>
            <span className="feat-icon">🧩</span>
            <span className="feat-label">Puzzles</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('learn')}>
            <span className="feat-icon">📺</span>
            <span className="feat-label">Learn</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('coach')}>
            <span className="feat-icon">🤖</span>
            <span className="feat-label">Coach</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('openings')}>
            <span className="feat-icon">📖</span>
            <span className="feat-label">Openings</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('multiplayer')}>
            <span className="feat-icon">🌐</span>
            <span className="feat-label">Online</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('leaderboard')}>
            <span className="feat-icon">🏆</span>
            <span className="feat-label">Rankings</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('profile')}>
            <span className="feat-icon">👤</span>
            <span className="feat-label">Profile</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('multiplayer')}>
            <span className="feat-icon">⚔️</span>
            <span className="feat-label">Challenge</span>
          </button>
        </div>

        {/* Bottom stats strip */}
        <div className="home-stats-strip">
          <div className="hss-item">
            <span className="hss-val">3</span>
            <span className="hss-lbl">Games</span>
          </div>
          <div className="hss-item">
            <span className="hss-val">GM</span>
            <span className="hss-lbl">AI Level</span>
          </div>
          <div className="hss-item">
            <span className="hss-val">98+</span>
            <span className="hss-lbl">Puzzles</span>
          </div>
          <div className="hss-item">
            <span className="hss-val">Free</span>
            <span className="hss-lbl">Forever</span>
          </div>
        </div>
      </div>
    );
  }
}

export default HomePage;
