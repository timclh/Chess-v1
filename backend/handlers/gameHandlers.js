/**
 * WebSocket message handlers — game logic extracted from app.js.
 *
 * Each handler receives (ws, message, roomManager) and is responsible
 * for one message type (create_room, join_room, move, etc.).
 */

const WebSocket = require('ws');
const EloService = require('../services/EloService');
const config = require('../config');

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

/**
 * Calculate ELO changes for both players and broadcast game_over
 * with rating information to each player.
 *
 * @param {object} room
 * @param {string} winnerColor - 'w', 'b', or null for draw
 * @param {string} reason - 'checkmate', 'resign', 'draw', 'timeout', 'disconnect'
 * @param {string} message - human-readable message
 */
function endGameWithRating(room, winnerColor, reason, message) {
  room.gameState.gameOver = true;
  room.gameState.result = message;

  const white = room.players.find(p => p.playerColor === 'w');
  const black = room.players.find(p => p.playerColor === 'b');

  if (!white || !black) {
    // Can't calculate ratings without both players
    broadcastToRoom(room, { type: 'game_over', reason, winner: winnerColor, message });
    return;
  }

  // Determine scores
  let scoreWhite;
  if (winnerColor === 'w') scoreWhite = 1;
  else if (winnerColor === 'b') scoreWhite = 0;
  else scoreWhite = 0.5; // draw

  const whiteRating = white.playerRating || config.elo.defaultRating;
  const blackRating = black.playerRating || config.elo.defaultRating;
  const whiteGames = white.playerGamesPlayed || 0;
  const blackGames = black.playerGamesPlayed || 0;

  const result = EloService.calculate(
    { rating: whiteRating, gamesPlayed: whiteGames },
    { rating: blackRating, gamesPlayed: blackGames },
    scoreWhite
  );

  // Send personalised game_over to each player
  const basePayload = {
    type: 'game_over',
    reason,
    winner: winnerColor,
    message,
    gameType: room.gameType,
  };

  send(white, {
    ...basePayload,
    playerResult: winnerColor === 'w' ? 'win' : winnerColor === 'b' ? 'loss' : 'draw',
    oldRating: whiteRating,
    newRating: result.newRatingA,
    ratingDelta: result.deltaA,
    opponentOldRating: blackRating,
    opponentNewRating: result.newRatingB,
  });

  send(black, {
    ...basePayload,
    playerResult: winnerColor === 'b' ? 'win' : winnerColor === 'w' ? 'loss' : 'draw',
    oldRating: blackRating,
    newRating: result.newRatingB,
    ratingDelta: result.deltaB,
    opponentOldRating: whiteRating,
    opponentNewRating: result.newRatingA,
  });
}

// ── Handlers ─────────────────────────────────────────────────

function handleCreateRoom(ws, message, roomManager) {
  const gameType = message.gameType || 'chess';
  const room = roomManager.create(gameType);

  const name = message.playerName || 'Player 1';
  room.addPlayer(ws, name);

  // Store player rating info on the WebSocket for ELO calculation
  ws.playerRating = message.rating || config.elo.defaultRating;
  ws.playerGamesPlayed = message.gamesPlayed || 0;

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

  // Store player rating info on the WebSocket for ELO calculation
  ws.playerRating = message.rating || config.elo.defaultRating;
  ws.playerGamesPlayed = message.gamesPlayed || 0;

  const opponent = room.players.find(p => p !== ws);
  send(ws, {
    type: 'room_joined',
    roomId,
    playerColor: color,
    gameType: room.gameType,
    gameState: room.gameState,
    opponentName: opponent?.playerName || 'Opponent',
    opponentRating: opponent?.playerRating || config.elo.defaultRating,
  });

  if (room.players.length === 2) {
    send(opponent, {
      type: 'opponent_joined',
      opponentName: name,
      opponentRating: ws.playerRating,
    });

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

  // If game ended via the move (checkmate/stalemate/draw)
  if (message.gameOver) {
    let winnerColor = null;
    let reason = 'checkmate';
    if (message.result && message.result.toLowerCase().includes('checkmate')) {
      // The side whose turn it is has been checkmated
      winnerColor = message.turn === 'w' ? 'b' : 'w';
    } else if (message.result && (message.result.toLowerCase().includes('stalemate') || message.result.toLowerCase().includes('draw'))) {
      winnerColor = null; // draw
      reason = 'draw';
    }
    endGameWithRating(room, winnerColor, reason, message.result);
    return;
  }

  const opponent = room.opponent(ws);
  send(opponent, {
    type: 'opponent_move',
    move: message.move,
    fen: message.fen,
    history: message.history,
    gameOver: false,
    result: null,
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
  const msg = `${ws.playerName} 认输 / ${ws.playerName} resigned`;
  endGameWithRating(room, winner, 'resign', msg);
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
    endGameWithRating(room, null, 'draw', '双方同意和棋 / Draw by agreement');
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

  // If game was in progress (2 players, not over), award win to remaining player
  if (room.players.length === 2 && !room.gameState.gameOver) {
    const winner = ws.playerColor === 'w' ? 'b' : 'w';
    const msg = `${ws.playerName} 断线判负 / ${ws.playerName} disconnected — opponent wins`;
    endGameWithRating(room, winner, 'disconnect', msg);
  }

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
