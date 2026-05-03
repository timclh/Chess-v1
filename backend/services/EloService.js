/**
 * ELO Rating Service
 *
 * Implements the Elo rating system with K-factor tiers:
 *   K=40  for new players (< 30 games)
 *   K=20  for regular players
 *   K=10  for master-level players (rating > 2400)
 *
 * Supports both Chess and Xiangqi ratings independently.
 */

const config = require('../config');

class EloService {
  /**
   * Calculate the expected score for playerA vs playerB.
   * @param {number} ratingA
   * @param {number} ratingB
   * @returns {number} expected score (0–1)
   */
  static expectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Determine the K-factor for a player.
   * @param {number} rating       - current rating
   * @param {number} gamesPlayed  - total games played
   * @returns {number}
   */
  static kFactor(rating, gamesPlayed) {
    if (gamesPlayed < config.elo.provisionalThreshold) {
      return config.elo.kFactorNew;
    }
    if (rating >= config.elo.masterThreshold) {
      return config.elo.kFactorMaster;
    }
    return config.elo.kFactorRegular;
  }

  /**
   * Calculate new ratings after a game.
   *
   * @param {object} playerA  - { rating: number, gamesPlayed: number }
   * @param {object} playerB  - { rating: number, gamesPlayed: number }
   * @param {number} scoreA   - actual score for A (1 = win, 0.5 = draw, 0 = loss)
   * @returns {{ newRatingA: number, newRatingB: number, deltaA: number, deltaB: number }}
   */
  static calculate(playerA, playerB, scoreA) {
    const expectedA = EloService.expectedScore(playerA.rating, playerB.rating);
    const expectedB = 1 - expectedA;

    const kA = EloService.kFactor(playerA.rating, playerA.gamesPlayed);
    const kB = EloService.kFactor(playerB.rating, playerB.gamesPlayed);

    const scoreB = 1 - scoreA;

    const deltaA = Math.round(kA * (scoreA - expectedA));
    const deltaB = Math.round(kB * (scoreB - expectedB));

    return {
      newRatingA: Math.max(100, playerA.rating + deltaA),
      newRatingB: Math.max(100, playerB.rating + deltaB),
      deltaA,
      deltaB,
    };
  }

  /**
   * Calculate rating change for a player vs AI opponent.
   * AI is modelled as a fixed-rating opponent based on difficulty.
   *
   * @param {object} player     - { rating, gamesPlayed }
   * @param {number} difficulty - 1–4
   * @param {number} score      - 1/0.5/0
   * @returns {{ newRating: number, delta: number }}
   */
  static calculateVsAI(player, difficulty, score) {
    const aiRatings = {
      1: 800,   // Easy
      2: 1200,  // Medium
      3: 1600,  // Hard
      4: 2200,  // Expert / Master
    };

    const aiRating = aiRatings[difficulty] || 1200;
    const expected = EloService.expectedScore(player.rating, aiRating);
    const k = EloService.kFactor(player.rating, player.gamesPlayed);

    const delta = Math.round(k * (score - expected));
    return {
      newRating: Math.max(100, player.rating + delta),
      delta,
    };
  }

  /**
   * Get a human-readable rank label from a rating.
   * @param {number} rating
   * @returns {string}
   */
  static rankLabel(rating) {
    if (rating >= 2400) return 'Grandmaster';
    if (rating >= 2200) return 'Master';
    if (rating >= 2000) return 'Expert';
    if (rating >= 1800) return 'Class A';
    if (rating >= 1600) return 'Class B';
    if (rating >= 1400) return 'Class C';
    if (rating >= 1200) return 'Class D';
    if (rating >= 1000) return 'Beginner';
    return 'Novice';
  }
}

module.exports = EloService;
