/**
 * RoomManager — manages the lifecycle of game rooms.
 * Replaces the loose Map + helper functions in the old app.js.
 */

const GameRoom = require('../models/GameRoom');
const config = require('../config');

class RoomManager {
  constructor() {
    /** @type {Map<string, GameRoom>} */
    this.rooms = new Map();

    // Periodic cleanup
    this._cleanupTimer = setInterval(
      () => this.cleanup(),
      config.roomCleanupInterval
    );
  }

  /** Create a new room and return it */
  create(gameType = 'chess') {
    const room = new GameRoom({ gameType });
    this.rooms.set(room.id, room);
    return room;
  }

  /** Get a room by id (or null) */
  get(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /** Delete a room */
  delete(roomId) {
    this.rooms.delete(roomId);
  }

  /** Schedule deletion of an empty room after a grace period */
  scheduleCleanup(roomId) {
    setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (room && room.isEmpty) {
        this.rooms.delete(roomId);
      }
    }, config.emptyRoomTimeout);
  }

  /** Remove stale rooms older than TTL with no players */
  cleanup() {
    const cutoff = Date.now() - config.roomTTL;
    for (const [id, room] of this.rooms) {
      if (room.createdAt < cutoff && room.isEmpty) {
        this.rooms.delete(id);
      }
    }
  }

  /** Get room count (for health / metrics) */
  get size() {
    return this.rooms.size;
  }

  /** Stop the cleanup timer (for graceful shutdown) */
  destroy() {
    clearInterval(this._cleanupTimer);
  }
}

module.exports = RoomManager;
