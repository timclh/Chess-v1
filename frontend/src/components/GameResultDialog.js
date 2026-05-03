/**
 * GameResultDialog Component
 *
 * Modal shown after a game ends displaying:
 * - Game result (win/loss/draw)
 * - Rating change
 * - Options to rematch, review, or return home
 */

import React from 'react';
import { RatingChangeDisplay } from './RatingDisplay';
import { shareGameResult, recordGameActivity } from '../services/SocialService';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle = {
  backgroundColor: '#2d2d2d',
  borderRadius: '12px',
  padding: '24px',
  minWidth: '300px',
  maxWidth: '400px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
};

const buttonContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginTop: '20px',
};

const buttonStyle = {
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const primaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#27ae60',
  color: 'white',
};

const secondaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: 'transparent',
  color: '#aaa',
  border: '1px solid #444',
};

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {'win'|'loss'|'draw'} props.result
 * @param {string} props.message - e.g. "Checkmate! White wins!"
 * @param {number} props.oldRating
 * @param {number} props.newRating
 * @param {string} [props.gameType] - 'chess' | 'xiangqi'
 * @param {string} [props.opponent] - opponent name
 * @param {number} [props.moves] - number of moves
 * @param {Function} props.onRematch
 * @param {Function} props.onReview - Open game review
 * @param {Function} props.onHome - Return to home
 * @param {Function} props.onClose
 */
export function GameResultDialog({
  isOpen,
  result,
  message,
  oldRating,
  newRating,
  gameType,
  opponent,
  moves,
  onRematch,
  onReview,
  onHome,
  onClose,
}) {
  if (!isOpen) return null;

  const ratingDelta = (newRating != null && oldRating != null) ? newRating - oldRating : undefined;

  const handleShare = async () => {
    // Record activity when sharing
    if (result && gameType) {
      recordGameActivity({ result, opponent: opponent || 'AI', gameType, moves: moves || 0, ratingDelta });
    }
    const { method } = await shareGameResult({
      result,
      opponent: opponent || 'AI',
      gameType: gameType || 'chess',
      moves: moves || 0,
      ratingDelta,
    });
    if (method === 'clipboard' || method === 'clipboard-fallback') {
      // Brief visual feedback
      const btn = document.getElementById('share-result-btn');
      if (btn) {
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = '📤 Share Result'; }, 2000);
      }
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={dialogStyle}>
        {/* Game message */}
        <div style={{ textAlign: 'center', marginBottom: '16px', color: '#ccc' }}>
          {message}
        </div>

        {/* Rating change */}
        {oldRating != null && newRating != null && (
          <RatingChangeDisplay
            oldRating={oldRating}
            newRating={newRating}
            result={result}
          />
        )}

        {/* Action buttons */}
        <div style={buttonContainerStyle}>
          {onRematch && (
            <button style={primaryButtonStyle} onClick={onRematch}>
              🔄 Play Again
            </button>
          )}
          {onReview && (
            <button style={secondaryButtonStyle} onClick={onReview}>
              📊 Review Game
            </button>
          )}
          {onHome && (
            <button style={secondaryButtonStyle} onClick={onHome}>
              🏠 Back to Home
            </button>
          )}
          <button id="share-result-btn" style={secondaryButtonStyle} onClick={handleShare}>
            📤 Share Result
          </button>
          {onClose && !onHome && (
            <button style={secondaryButtonStyle} onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameResultDialog;
