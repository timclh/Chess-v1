/**
 * RatingDisplay Component
 *
 * Shows player's current ELO rating with rank icon.
 * Used in game screens and leaderboard.
 */

import React from 'react';
import EloService from '../services/EloService';
import { getRating } from '../services/UserRatingService';
import { GAME_TYPE } from '../constants';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: '14px',
  },
  icon: {
    fontSize: '18px',
  },
  rating: {
    fontWeight: 'bold',
    color: '#e2b714',
  },
  label: {
    color: '#aaa',
    fontSize: '12px',
  },
  delta: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  deltaPositive: {
    color: '#27ae60',
  },
  deltaNegative: {
    color: '#e74c3c',
  },
  compact: {
    padding: '4px 8px',
    fontSize: '12px',
  },
};

/**
 * Display the player's rating for a game type.
 * @param {Object} props
 * @param {'chess'|'xiangqi'} props.gameType
 * @param {number} [props.delta] - Optional rating change to show
 * @param {boolean} [props.compact] - Smaller display
 * @param {Object} [props.style] - Additional styles
 */
export function RatingDisplay({ gameType = GAME_TYPE.CHESS, delta, compact, style }) {
  const data = getRating(gameType);
  const rank = EloService.getRank(data.rating);

  return (
    <div style={{ ...styles.container, ...(compact && styles.compact), ...style }}>
      <span style={styles.icon}>{rank.icon}</span>
      <span style={styles.rating}>{data.rating}</span>
      <span style={styles.label}>{rank.label}</span>
      {delta != null && delta !== 0 && (
        <span style={{
          ...styles.delta,
          ...(delta > 0 ? styles.deltaPositive : styles.deltaNegative),
        }}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
}

/**
 * Display rating change after a game.
 * @param {Object} props
 * @param {number} props.oldRating
 * @param {number} props.newRating
 * @param {'win'|'loss'|'draw'} props.result
 */
export function RatingChangeDisplay({ oldRating, newRating, result }) {
  const delta = newRating - oldRating;
  const newRank = EloService.getRank(newRating);

  const resultLabels = {
    win: 'Victory!',
    loss: 'Defeat',
    draw: 'Draw',
  };

  const resultColors = {
    win: '#27ae60',
    loss: '#e74c3c',
    draw: '#f39c12',
  };

  return (
    <div style={{ textAlign: 'center', padding: '16px' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: resultColors[result], marginBottom: '12px' }}>
        {resultLabels[result]}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        <div style={{ color: '#888' }}>{oldRating}</div>
        <div style={{ fontSize: '20px' }}>→</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e2b714' }}>
          {newRating}
        </div>
        <span style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: delta >= 0 ? '#27ae60' : '#e74c3c',
        }}>
          ({delta >= 0 ? '+' : ''}{delta})
        </span>
      </div>
      <div style={{ marginTop: '8px', fontSize: '14px', color: '#aaa' }}>
        {newRank.icon} {newRank.label}
      </div>
    </div>
  );
}

/**
 * Inline rating badge for use in headers/nav.
 */
export function RatingBadge({ gameType = GAME_TYPE.CHESS, onClick }) {
  const data = getRating(gameType);
  const rank = EloService.getRank(data.rating);

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: onClick ? 'pointer' : 'default',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        fontSize: '12px',
      }}
      title={`${rank.label} (${data.gamesPlayed} games)`}
    >
      <span>{rank.icon}</span>
      <span style={{ color: '#e2b714', fontWeight: 'bold' }}>{data.rating}</span>
    </span>
  );
}

export default RatingDisplay;
