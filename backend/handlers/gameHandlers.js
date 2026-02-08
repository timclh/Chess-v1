/**
 * WebSocket message handlers — game logic extracted from app.js.
 *
 * Each handler receives (ws, message, roomManager) and is responsible
 * for one message type (create_room, join_room, move, etc.).
 */

const WebSocket = require('ws');

// ── Helpers ──────────────────────────────────────────────────

function send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(room, payload) {
  const data = JSON.stringify(payload);
  room.players.forEach(p => {
    if (p.readyState === WebSocket.OPEN) p.send(data);
  });
}

// ── Handlers ─────────────────────────────────────────────────

function handleCreateRoom(ws, message, roomManager) {
  const gameType = message.gameType || 'chess';
  const room = roomManager.create(gameType);

  const name = message.playerName || 'Player 1';
  room.addPlayer(ws, name);

  send(ws, {
    type: 'room_created',
    roomId: room.id,
    playerColor: 'w',
    gameType,
    message: '房间已创建，等待对手加入… / Room created, waiting for opponent…',
  });
}

function handleJoinRoom(ws, message, roomManager) {
  const { roomId, playerName } = message;
  const room = roomManager.get(roomId);

  if (!room) {
    return send(ws, { type: 'error', message: '房间不存在 / Room not found' });
  }
  if (room.isFull) {
    return send(ws, { type: 'error', message: '房间已满 / Room is full' });
  }

  const name = playerName || 'Player 2';
  const color = room.addPlayer(ws, name);

  send(ws, {
    type: 'room_joined',
    roomId,
    playerColor: color,
    gameType: room.gameType,
    gameState: room.gameState,
    opponentName: room.players[0]?.playerName || 'Opponent',
  });

  if (room.players.length === 2) {
    const other = room.opponent(ws);
    send(other, { type: 'opponent_joined', opponentName: name });

    broadcastToRoom(room, {
      type: 'game_start',
      message: '游戏开始！/ Game started!',
      gameType: room.gameType,
      whitePlayer: room.players.find(p => p.playerColor === 'w')?.playerName,
      blackPlayer: room.players.find(p => p.playerColor === 'b')?.playerName,
    });
  }
}

function handleMove(ws, message, roomManager) {
  const room = roomManager.get(ws.roomId);
  if (!room) return;

  room.gameState = {
    fen: message.fen,
    history: message.history,
    turn: message.turn,
    gameOver: message.gameOver || false,
    result: message.result || null,
  };
  room.drawOffer = null;
  room.touch();

  const opponent = room.opponent(ws);
  send(opponent, {
    type: 'opponent_move',
    move: message.move,
    fen: message.fen,
    history: message.history,
    gameOver: message.gameOver,
    result: message.result,
  });
}

function handleChat(ws, message, roomManager, wss) {
  const room = roomManager.get(ws.roomId);
  if (!room) {
    // Legacy global chat
    const data = JSON.stringify({ name: ws.playerName, message: message.text });
    wss.clients.forEach(c => {
      if (c !== ws && c.readyState === WebSocket.OPEN) c.send(data);
    });
    return;
  }
  broadcastToRoom(room, {
    type: 'chat',
    name: ws.playerName,
    message: message.text,
  });
}

function handleResign(ws, _message, roomManager) {
  const room = roomManager.get(ws.roomId);
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

function handleDrawOffer(ws, _message, roomManager) {
  const room = roomManager.get(ws.roomId);
  if (!room) return;
  room.drawOffer = ws.playerColor;
  send(room.opponent(ws), { type: 'draw_offered', from: ws.playerName });
}

function handleDrawResponse(ws, message, roomManager) {
  const room = roomManager.get(ws.roomId);
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
    send(room.opponent(ws), { type: 'draw_declined' });
  }
}

function handleRematch(ws, _message, roomManager) {
  const room = roomManager.get(ws.roomId);
  if (!room) return;

  room.swapColors();
  room.resetGame();

  broadcastToRoom(room, {
    type: 'rematch_start',
    gameState: room.gameState,
    whitePlayer: room.players.find(p => p.playerColor === 'w')?.playerName,
    blackPlayer: room.players.find(p => p.playerColor === 'b')?.playerName,
  });
}

function handleDisconnect(ws, roomManager) {
  if (!ws.roomId) return;
  const room = roomManager.get(ws.roomId);
  if (!room) return;

  room.removePlayer(ws);

  if (room.players.length > 0) {
    broadcastToRoom(room, {
      type: 'opponent_disconnected',
      message: `${ws.playerName} 已断开连接 / ${ws.playerName} disconnected`,
    });
  }

  if (room.isEmpty) {
    roomManager.scheduleCleanup(ws.roomId);
  }
}

module.exports = {
  handleCreateRoom,
  handleJoinRoom,
  handleMove,
  handleChat,
  handleResign,
  handleDrawOffer,
  handleDrawResponse,
  handleRematch,
  handleDisconnect,
};
