const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = process.env.WS_PORT || process.env.PORT || 3030;

// Create HTTP server for health checks (required by Render.com)
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'chess-websocket' }));
  } else if (req.url === '/create-room' && req.method === 'GET') {
    // Create a new game room
    const roomId = generateRoomId();
    gameRooms.set(roomId, {
      id: roomId,
      players: [],
      gameState: null,
      createdAt: Date.now(),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ roomId }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

// Game rooms storage
const gameRooms = new Map();

// Generate unique room ID
function generateRoomId() {
  return crypto.randomBytes(4).toString('hex');
}

// Clean up old rooms (older than 2 hours)
function cleanupOldRooms() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [roomId, room] of gameRooms.entries()) {
    if (room.createdAt < twoHoursAgo && room.players.length === 0) {
      gameRooms.delete(roomId);
      console.log(`Cleaned up old room: ${roomId}`);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldRooms, 30 * 60 * 1000);

console.log(`Server starting on port ${PORT}`);

wss.on('connection', function connection(ws, req) {
  const clientIp = req.socket.remoteAddress;
  console.log(`Client connected from ${clientIp}`);

  // Client state
  ws.roomId = null;
  ws.playerColor = null;
  ws.playerName = null;

  ws.on('message', function incoming(data) {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });

  ws.on('close', function close() {
    console.log(`Client disconnected from ${clientIp}`);
    handleDisconnect(ws);
  });
});

function handleMessage(ws, message) {
  switch (message.type) {
    case 'join_room':
      handleJoinRoom(ws, message);
      break;
    case 'create_room':
      handleCreateRoom(ws, message);
      break;
    case 'move':
      handleMove(ws, message);
      break;
    case 'chat':
      handleChat(ws, message);
      break;
    case 'resign':
      handleResign(ws, message);
      break;
    case 'draw_offer':
      handleDrawOffer(ws, message);
      break;
    case 'draw_response':
      handleDrawResponse(ws, message);
      break;
    case 'rematch':
      handleRematch(ws, message);
      break;
    default:
      // Legacy chat message handling
      broadcastToOthers(ws, message);
  }
}

function handleCreateRoom(ws, message) {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    players: [],
    gameState: {
      fen: 'start',
      history: [],
      turn: 'w',
      gameOver: false,
      result: null,
    },
    createdAt: Date.now(),
    drawOffer: null,
  };

  gameRooms.set(roomId, room);

  // Add creator to room
  ws.roomId = roomId;
  ws.playerName = message.playerName || 'Player 1';
  ws.playerColor = 'w'; // Creator plays white
  room.players.push(ws);

  ws.send(JSON.stringify({
    type: 'room_created',
    roomId,
    playerColor: 'w',
    message: '房间已创建，等待对手加入... / Room created, waiting for opponent...',
  }));

  console.log(`Room created: ${roomId}`);
}

function handleJoinRoom(ws, message) {
  const { roomId, playerName } = message;
  const room = gameRooms.get(roomId);

  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '房间不存在 / Room not found',
    }));
    return;
  }

  if (room.players.length >= 2) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '房间已满 / Room is full',
    }));
    return;
  }

  // Add player to room
  ws.roomId = roomId;
  ws.playerName = playerName || 'Player 2';
  ws.playerColor = room.players.length === 0 ? 'w' : 'b';
  room.players.push(ws);

  // Notify the joining player
  ws.send(JSON.stringify({
    type: 'room_joined',
    roomId,
    playerColor: ws.playerColor,
    gameState: room.gameState,
    opponentName: room.players[0]?.playerName || 'Opponent',
  }));

  // Notify the other player that opponent joined
  if (room.players.length === 2) {
    const otherPlayer = room.players.find(p => p !== ws);
    if (otherPlayer && otherPlayer.readyState === WebSocket.OPEN) {
      otherPlayer.send(JSON.stringify({
        type: 'opponent_joined',
        opponentName: ws.playerName,
      }));
    }

    // Start the game
    broadcastToRoom(room, {
      type: 'game_start',
      message: '游戏开始！/ Game started!',
      whitePlayer: room.players.find(p => p.playerColor === 'w')?.playerName,
      blackPlayer: room.players.find(p => p.playerColor === 'b')?.playerName,
    });
  }

  console.log(`Player joined room ${roomId}. Players: ${room.players.length}`);
}

function handleMove(ws, message) {
  const room = gameRooms.get(ws.roomId);
  if (!room) return;

  // Update game state
  room.gameState = {
    fen: message.fen,
    history: message.history,
    turn: message.turn,
    gameOver: message.gameOver || false,
    result: message.result || null,
  };

  // Clear any draw offer on move
  room.drawOffer = null;

  // Broadcast move to opponent
  const opponent = room.players.find(p => p !== ws);
  if (opponent && opponent.readyState === WebSocket.OPEN) {
    opponent.send(JSON.stringify({
      type: 'opponent_move',
      move: message.move,
      fen: message.fen,
      history: message.history,
      gameOver: message.gameOver,
      result: message.result,
    }));
  }
}

function handleChat(ws, message) {
  const room = gameRooms.get(ws.roomId);
  if (!room) {
    // Legacy broadcast for non-room chat
    broadcastToOthers(ws, { name: ws.playerName, message: message.text });
    return;
  }

  broadcastToRoom(room, {
    type: 'chat',
    name: ws.playerName,
    message: message.text,
  });
}

function handleResign(ws, message) {
  const room = gameRooms.get(ws.roomId);
  if (!room) return;

  const winner = ws.playerColor === 'w' ? 'b' : 'w';
  room.gameState.gameOver = true;
  room.gameState.result = `${winner === 'w' ? 'White' : 'Black'} wins by resignation`;

  broadcastToRoom(room, {
    type: 'game_over',
    reason: 'resign',
    winner,
    message: `${ws.playerName} 认输 / ${ws.playerName} resigned`,
  });
}

function handleDrawOffer(ws, message) {
  const room = gameRooms.get(ws.roomId);
  if (!room) return;

  room.drawOffer = ws.playerColor;

  const opponent = room.players.find(p => p !== ws);
  if (opponent && opponent.readyState === WebSocket.OPEN) {
    opponent.send(JSON.stringify({
      type: 'draw_offered',
      from: ws.playerName,
    }));
  }
}

function handleDrawResponse(ws, message) {
  const room = gameRooms.get(ws.roomId);
  if (!room || !room.drawOffer) return;

  if (message.accept) {
    room.gameState.gameOver = true;
    room.gameState.result = 'Draw by agreement';

    broadcastToRoom(room, {
      type: 'game_over',
      reason: 'draw',
      message: '双方同意和棋 / Draw by agreement',
    });
  } else {
    room.drawOffer = null;

    const opponent = room.players.find(p => p !== ws);
    if (opponent && opponent.readyState === WebSocket.OPEN) {
      opponent.send(JSON.stringify({
        type: 'draw_declined',
      }));
    }
  }
}

function handleRematch(ws, message) {
  const room = gameRooms.get(ws.roomId);
  if (!room) return;

  // Swap colors
  room.players.forEach(p => {
    p.playerColor = p.playerColor === 'w' ? 'b' : 'w';
  });

  // Reset game state
  room.gameState = {
    fen: 'start',
    history: [],
    turn: 'w',
    gameOver: false,
    result: null,
  };
  room.drawOffer = null;

  broadcastToRoom(room, {
    type: 'rematch_start',
    gameState: room.gameState,
    whitePlayer: room.players.find(p => p.playerColor === 'w')?.playerName,
    blackPlayer: room.players.find(p => p.playerColor === 'b')?.playerName,
  });
}

function handleDisconnect(ws) {
  if (!ws.roomId) return;

  const room = gameRooms.get(ws.roomId);
  if (!room) return;

  // Remove player from room
  room.players = room.players.filter(p => p !== ws);

  // Notify other player
  if (room.players.length > 0) {
    broadcastToRoom(room, {
      type: 'opponent_disconnected',
      message: `${ws.playerName} 已断开连接 / ${ws.playerName} disconnected`,
    });
  }

  // Clean up empty room after a delay (allow reconnection)
  if (room.players.length === 0) {
    setTimeout(() => {
      const currentRoom = gameRooms.get(ws.roomId);
      if (currentRoom && currentRoom.players.length === 0) {
        gameRooms.delete(ws.roomId);
        console.log(`Room ${ws.roomId} deleted (empty)`);
      }
    }, 60000); // 1 minute delay
  }
}

function broadcastToRoom(room, message) {
  const data = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(data);
    }
  });
}

function broadcastToOthers(ws, message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  });
}

wss.on('error', function error(err) {
  console.error('WebSocket server error:', err);
});

// Start the server
server.listen(PORT, () => {
  console.log(`HTTP + WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down server...');
  wss.clients.forEach(function each(client) {
    client.close(1001, 'Server shutting down');
  });
  server.close(function () {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
