/**
 * HTTP routes — health check + room creation REST endpoint.
 */

const config = require('../config');

/**
 * Check whether the given origin is allowed by config.corsOrigins.
 * Supports wildcard ('*') and exact-match entries.
 */
function isOriginAllowed(origin) {
  if (config.corsOrigins.includes('*')) return true;
  return config.corsOrigins.includes(origin);
}

/**
 * Attach HTTP routes to an existing http.Server request handler.
 * Returns a request listener function for http.createServer().
 *
 * @param {import('../services/RoomManager')} roomManager
 */
function createRequestHandler(roomManager) {
  return (req, res) => {
    // CORS — validate origin against config
    const origin = req.headers.origin || '';
    const allowedOrigin = isOriginAllowed(origin) ? origin : '';
    if (allowedOrigin || config.corsOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // ── Health ──────────────────────────────────────────
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'chess-websocket',
        rooms: roomManager.size,
        uptime: process.uptime(),
      }));
      return;
    }

    // ── Create Room (REST) ─────────────────────────────
    if (req.url === '/create-room' && req.method === 'GET') {
      const room = roomManager.create();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ roomId: room.id }));
      return;
    }

    // ── Stats (for monitoring) ─────────────────────────
    if (req.url === '/stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        rooms: roomManager.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: config.nodeEnv,
      }));
      return;
    }

    // ── 404 ────────────────────────────────────────────
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  };
}

module.exports = { createRequestHandler };
