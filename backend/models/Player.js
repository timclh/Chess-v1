/**
 * Player model — in-memory representation of a connected player.
 * Designed to be replaced by a DB-backed model when PostgreSQL lands.
 */

const config = require('../config');

class Player {
  /**
   * @param {object} opts
   * @param {string} opts.id         - unique id (socket or uid)
   * @param {string} opts.name       - display name
   * @param {string} [opts.uid]      - Firebase UID (if authenticated)
   * @param {number} [opts.chessElo]
   * @param {number} [opts.xiangqiElo]
   */
  constructor({ id, name, uid = null, chessElo, xiangqiElo }) {
    this.id = id;
    this.name = name;
    this.uid = uid;
    this.chessElo = chessElo ?? config.elo.defaultRating;
    this.xiangqiElo = xiangqiElo ?? config.elo.defaultRating;
    this.gamesPlayed = { chess: 0, xiangqi: 0 };
    this.connectedAt = Date.now();
  }

  /** Serialise for API / client */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      uid: this.uid,
      chessElo: this.chessElo,
      xiangqiElo: this.xiangqiElo,
      gamesPlayed: this.gamesPlayed,
    };
  }
}

module.exports = Player;
