/**
 * ELO Rating Service — client-side mirror of backend EloService.
 *
 * Used for:
 *   1. Instant rating preview after a game (before server confirms)
 *   2. Offline / AI-only games where the backend isn't involved
 *   3. Displaying rank labels in the UI
 */

import config from '../config';
import { RANK_THRESHOLDS } from '../constants';

class EloService {
  /**
   * Expected score for playerA against playerB.
   */
  static expectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * K-factor based on rating and experience.
   */
  static kFactor(rating, gamesPlayed) {
    const { provisionalThreshold, masterThreshold, kFactorNew, kFactorMaster, kFactorRegular } = config.elo;
    if (gamesPlayed < provisionalThreshold) return kFactorNew;
    if (rating >= masterThreshold) return kFactorMaster;
    return kFactorRegular;
  }

  /**
   * Calculate new ratings after a PvP game.
   * @param {{ rating: number, gamesPlayed: number }} playerA
   * @param {{ rating: number, gamesPlayed: number }} playerB
   * @param {number} scoreA   1 = win, 0.5 = draw, 0 = loss
   */
  static calculate(playerA, playerB, scoreA) {
    const expectedA = EloService.expectedScore(playerA.rating, playerB.rating);
    const kA = EloService.kFactor(playerA.rating, playerA.gamesPlayed);
    const kB = EloService.kFactor(playerB.rating, playerB.gamesPlayed);
    const scoreB = 1 - scoreA;
    const expectedB = 1 - expectedA;

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
   * Calculate rating change for a game against AI.
   * @param {{ rating: number, gamesPlayed: number }} player
   * @param {number} difficulty  1–4
   * @param {number} score       1/0.5/0
   */
  static calculateVsAI(player, difficulty, score) {
    const aiRatings = { 1: 800, 2: 1200, 3: 1600, 4: 2200 };
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
   * Get rank label + icon for a rating.
   */
  static getRank(rating) {
    for (const rank of RANK_THRESHOLDS) {
      if (rating >= rank.min) return rank;
    }
    return RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  }

  /**
   * Format rating for display: "1234 🔶 Class B"
   */
  static formatRating(rating) {
    const rank = EloService.getRank(rating);
    return `${rating} ${rank.icon} ${rank.label}`;
  }
}

export default EloService;
