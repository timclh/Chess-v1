/**
 * 棋 Arena — Backend Entry Point
 *
 * Thin wiring layer:  config → services → routes → handlers → listen.
 * All game logic lives in handlers/gameHandlers.js.
 * All room state lives in services/RoomManager.js.
 */

const http = require('http');
const WebSocket = require('ws');

const config = require('./config');
const RoomManager = require('./services/RoomManager');
const { createRequestHandler } = require('./routes/health');
const handlers = require('./handlers/gameHandlers');

// ── Services ────────────────────────────────────────────────
const roomManager = new RoomManager();

// ── HTTP Server ─────────────────────────────────────────────
const server = http.createServer(createRequestHandler(roomManager));

// ── WebSocket Server ────────────────────────────────────────
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  if (config.isDev) console.log(`Client connected from ${clientIp}`);

  ws.roomId = null;
  ws.playerColor = null;
  ws.playerName = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      routeMessage(ws, message);
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('error', (err) => console.error('WebSocket error:', err));

  ws.on('close', () => {
    if (config.isDev) console.log(`Client disconnected from ${clientIp}`);
    handlers.handleDisconnect(ws, roomManager);
  });
});

// ── Message Router ──────────────────────────────────────────
function routeMessage(ws, message) {
  switch (message.type) {
    case 'create_room':     return handlers.handleCreateRoom(ws, message, roomManager);
    case 'join_room':       return handlers.handleJoinRoom(ws, message, roomManager);
    case 'move':            return handlers.handleMove(ws, message, roomManager);
    case 'chat':            return handlers.handleChat(ws, message, roomManager, wss);
    case 'resign':          return handlers.handleResign(ws, message, roomManager);
    case 'draw_offer':      return handlers.handleDrawOffer(ws, message, roomManager);
    case 'draw_response':   return handlers.handleDrawResponse(ws, message, roomManager);
    case 'rematch':         return handlers.handleRematch(ws, message, roomManager);
    default:
      // Legacy global chat
      const data = JSON.stringify(message);
      wss.clients.forEach(c => {
        if (c !== ws && c.readyState === WebSocket.OPEN) c.send(data);
      });
  }
}

wss.on('error', (err) => console.error('WebSocket server error:', err));

// ── Start ───────────────────────────────────────────────────
server.listen(config.port, () => {
  console.log(`棋 Arena server running on port ${config.port} [${config.nodeEnv}]`);
});

// ── Graceful Shutdown ───────────────────────────────────────
function shutdown() {
  console.log('Shutting down…');
  roomManager.destroy();
  wss.clients.forEach(c => c.close(1001, 'Server shutting down'));
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
