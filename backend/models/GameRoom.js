/**
 * GameRoom model — manages a single game room's state.
 */

const crypto = require('crypto');

class GameRoom {
  /**
   * @param {object} [opts]
   * @param {string} [opts.id]        - room id (auto-generated if omitted)
   * @param {string} [opts.gameType]  - 'chess' | 'xiangqi'
   */
  constructor({ id, gameType = 'chess' } = {}) {
    this.id = id || GameRoom.generateId();
    this.gameType = gameType;
    this.players = [];          // WebSocket refs
    this.gameState = {
      fen: 'start',
      history: [],
      turn: 'w',
      gameOver: false,
      result: null,
    };
    this.drawOffer = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  /** Generate a short random room id */
  static generateId() {
    return crypto.randomBytes(4).toString('hex');
  }

  get isFull() {
    return this.players.length >= 2;
  }

  get isEmpty() {
    return this.players.length === 0;
  }

  /** Touch last-activity timer (for cleanup) */
  touch() {
    this.lastActivity = Date.now();
  }

  /** Add a player WebSocket; returns assigned colour */
  addPlayer(ws, name) {
    const color = this.players.length === 0 ? 'w' : 'b';
    ws.roomId = this.id;
    ws.playerName = name;
    ws.playerColor = color;
    this.players.push(ws);
    this.touch();
    return color;
  }

  /** Remove a player from the room */
  removePlayer(ws) {
    this.players = this.players.filter(p => p !== ws);
  }

  /** Get the opponent WebSocket (if any) */
  opponent(ws) {
    return this.players.find(p => p !== ws) || null;
  }

  /** Swap player colours (for rematch) */
  swapColors() {
    this.players.forEach(p => {
      p.playerColor = p.playerColor === 'w' ? 'b' : 'w';
    });
  }

  /** Reset game state for rematch */
  resetGame() {
    this.gameState = {
      fen: 'start',
      history: [],
      turn: 'w',
      gameOver: false,
      result: null,
    };
    this.drawOffer = null;
    this.touch();
  }

  /** Serialise for API */
  toJSON() {
    return {
      id: this.id,
      gameType: this.gameType,
      players: this.players.map(p => ({
        name: p.playerName,
        color: p.playerColor,
      })),
      gameState: this.gameState,
      createdAt: this.createdAt,
    };
  }
}

module.exports = GameRoom;
