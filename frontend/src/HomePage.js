/**
 * HomePage - Unified Landing Page
 * Choose between International Chess and Chinese Chess (Xiangqi)
 */

import React, { Component } from 'react';
import { getStreak, isTodayCompleted } from './services/DailyPuzzleService';
import { getRating } from './services/UserRatingService';
import { GAME_TYPE } from './constants';
import { Icon } from './components/Icon';
import { prewarmOnIntent } from './services/XiangqiCoachService';

class HomePage extends Component {
  render() {
    const { onNavigate } = this.props;
    const streak = getStreak();
    const todayDone = isTodayCompleted();
    const chessRating = getRating(GAME_TYPE.CHESS).rating || 1200;
    const xiangqiRating = getRating(GAME_TYPE.XIANGQI).rating || 1200;

    return (
      <div className="home-page">
        {/* Featured Mode: Tiangong Celestial Court Tower Defense */}
        <div
          className="home-tiangong-hero"
          data-testid="home-tiangong-hero"
          onClick={() => onNavigate('tiangong')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('tiangong'); }}
        >
          <div className="hth-left">
            <div className="hth-badge-row">
              <span className="hth-pill">NEW · 仙界肉鸽塔防</span>
              <span className="hth-sub-pill">3★ 法天象地</span>
            </div>
            <div className="hth-title brush">天宫弈 · 南天门守卫战</div>
            <div className="hth-desc">
              召唤【兵/車/馬/炮/相】合阵化神，敕封天道法旨，镇压十五波九幽妖潮！
            </div>
          </div>
          <div className="hth-right" aria-hidden="true">
            <span className="hth-seal brush">天</span>
            <span className="hth-cta">立即镇守 ▶</span>
          </div>
        </div>

        {/* Game Selection - big tappable cards */}
        <div className="home-games">
          <div className="home-game-card hgc-chess" onClick={() => onNavigate('game')}>
            <div className="hgc-pieces" aria-hidden="true">♚♔</div>
            <div className="hgc-info">
              <span className="hgc-title">Chess</span>
              <span className="hgc-rating">ELO {chessRating}</span>
            </div>
          </div>
          <div className="home-game-card hgc-xiangqi" onClick={() => onNavigate('xiangqi')} {...prewarmOnIntent}>
            <div className="hgc-pieces" aria-hidden="true"><span className="hgc-coin r brush">帥</span><span className="hgc-coin b brush">將</span></div>
            <div className="hgc-info">
              <span className="hgc-title brush">象棋</span>
              <span className="hgc-rating">ELO {xiangqiRating}</span>
            </div>
          </div>
          <div className="home-game-card hgc-gomoku" onClick={() => onNavigate('wuziqi')}>
            <div className="hgc-pieces" aria-hidden="true"><span className="hgc-stone black" /><span className="hgc-stone white" /></div>
            <div className="hgc-info">
              <span className="hgc-title brush">五子棋</span>
              <span className="hgc-sub">Gomoku</span>
            </div>
          </div>
        </div>

        {/* Daily Challenge Banner */}
        <div className="home-daily" onClick={() => onNavigate('puzzles')}>
          <div className="daily-left">
            <span className="daily-icon"><Icon name={todayDone ? 'done' : 'puzzles'} size={26} /></span>
            <div className="daily-text">
              <span className="daily-title">{todayDone ? 'Puzzle Complete!' : 'Daily Puzzle'}</span>
              <span className="daily-sub">{todayDone ? 'Come back tomorrow' : 'Solve today\'s challenge'}</span>
            </div>
          </div>
          <div className="daily-streak">
            <span className="streak-num"><Icon name="streak" size={16} /> {streak.current}</span>
            <span className="streak-label">streak</span>
          </div>
        </div>

        {/* Feature Grid - 2x4 */}
        <div className="home-features">
          <button className="home-feat" onClick={() => onNavigate('puzzles')}>
            <span className="feat-icon"><Icon name="puzzles" size={24} /></span>
            <span className="feat-label">Puzzles</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('learn')}>
            <span className="feat-icon"><Icon name="videos" size={24} /></span>
            <span className="feat-label">Learn</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('coach')}>
            <span className="feat-icon"><Icon name="coach" size={24} /></span>
            <span className="feat-label">Coach</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('openings')}>
            <span className="feat-icon"><Icon name="learn" size={24} /></span>
            <span className="feat-label">Openings</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('multiplayer')}>
            <span className="feat-icon"><Icon name="online" size={24} /></span>
            <span className="feat-label">Online</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('leaderboard')}>
            <span className="feat-icon"><Icon name="rankings" size={24} /></span>
            <span className="feat-label">Rankings</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('profile')}>
            <span className="feat-icon"><Icon name="profile" size={24} /></span>
            <span className="feat-label">Profile</span>
          </button>
          <button className="home-feat" onClick={() => onNavigate('multiplayer')}>
            <span className="feat-icon"><Icon name="challenge" size={24} /></span>
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
