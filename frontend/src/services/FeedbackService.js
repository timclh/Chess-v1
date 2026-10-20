/**
 * Feedback Service: the "feel" of a move.
 *
 * One call per game event that plays the matching sound (SoundService, mutable)
 * and fires a haptic pulse on native builds (CapacitorService, a no-op on web).
 * Games call these instead of talking to the two services separately, so every
 * game feels the same.
 */

import { playSound, soundForMove, SOUND } from './SoundService';
import { hapticTap, hapticImpact, hapticNotification } from './CapacitorService';

// Haptics return promises; a failure must never reach the game.
function fire(promise) {
  try {
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  } catch (_) { /* ignore */ }
}

/**
 * Sound + haptic for a move that has just been played.
 * `info` is what soundForMove takes: { captured, inCheck, gameOver, won }.
 * Returns the sound name that was chosen.
 */
export function moveFeedback(info = {}) {
  const sound = soundForMove(info);
  playSound(sound);
  if (sound === SOUND.WIN) fire(hapticNotification('success'));
  else if (sound === SOUND.LOSE) fire(hapticNotification('error'));
  else if (sound === SOUND.CHECK) fire(hapticNotification('warning'));
  else if (sound === SOUND.CAPTURE) fire(hapticImpact());
  else fire(hapticTap());
  return sound;
}

/**
 * Chess (chess.js): derive the feedback from the move just made and the
 * position after it. `playerWon` says who the result favours when the game
 * ended in checkmate; draws end quietly (a plain move sound).
 */
export function chessMoveFeedback(game, move, playerColor) {
  if (!game || !move) return null;
  const mate = game.in_checkmate();
  return moveFeedback({
    captured: !!move.captured,
    inCheck: !mate && game.in_check(),
    gameOver: mate,
    won: mate && move.color === playerColor,
  });
}

/** A piece was picked up / selected. */
export function selectFeedback() {
  playSound(SOUND.SELECT);
  fire(hapticTap());
}

/**
 * A gomoku stone was placed. `gameOver` + `won` when the move ended the game.
 */
export function placeFeedback({ gameOver = false, won = false } = {}) {
  if (gameOver) {
    playSound(won ? SOUND.WIN : SOUND.LOSE);
    fire(hapticNotification(won ? 'success' : 'error'));
    return;
  }
  playSound(SOUND.PLACE);
  fire(hapticTap());
}
