// Chess AI with Educational Features
// Uses Minimax with Alpha-Beta Pruning + Move Ordering + Transposition Table + Opening Book

// Transposition table for caching evaluated positions
const transpositionTable = new Map();
const MAX_CACHE_SIZE = 100000;

// Clear cache when it gets too large
function clearCacheIfNeeded() {
  if (transpositionTable.size > MAX_CACHE_SIZE) {
    transpositionTable.clear();
  }
}

// Opening book for instant responses in common positions
const openingBook = {
  // Starting position - common first moves
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['e4', 'd4', 'Nf3', 'c4'],
  // After 1.e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': ['e5', 'c5', 'e6', 'c6'],
  // After 1.d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': ['d5', 'Nf6', 'e6'],
  // After 1.e4 e5
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['Nf3', 'Nc3', 'Bc4'],
  // After 1.e4 e5 2.Nf3
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': ['Nc6', 'Nf6', 'd6'],
  // After 1.e4 c5 (Sicilian)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['Nf3', 'Nc3', 'd4'],
  // After 1.d4 d5
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': ['c4', 'Nf3', 'Bf4'],
  // After 1.d4 Nf6
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': ['c4', 'Nf3', 'Bg5'],
  // Italian Game setup
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['Bc4', 'Bb5', 'd4'],
  // After Bc4
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': ['Bc5', 'Nf6', 'Be7'],
};

// Get opening book move (returns null if not in book)
function getOpeningMove(game) {
  const fen = game.fen().split(' ').slice(0, 4).join(' '); // Position without move counts
  const moves = openingBook[fen];
  if (moves && moves.length > 0) {
    // Randomly select from good opening moves
    const validMoves = moves.filter(m => {
      const legalMoves = game.moves();
      return legalMoves.includes(m);
    });
    if (validMoves.length > 0) {
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
  }
  return null;
}

// Piece values for evaluation
const pieceValues = {
  p: 100,   // pawn
  n: 320,   // knight
  b: 330,   // bishop
  r: 500,   // rook
  q: 900,   // queen
  k: 20000, // king
};

// Piece names for explanations
const pieceNames = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

// Position bonuses for pieces (encourage good positioning)
const pawnTable = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0,
];

const knightTable = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const bishopTable = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const rookTable = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0,
];

const queenTable = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const kingMiddleTable = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20,
];

// King endgame table (encourage centralization)
const kingEndgameTable = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
];

const positionTables = {
  p: pawnTable,
  n: knightTable,
  b: bishopTable,
  r: rookTable,
  q: queenTable,
  k: kingMiddleTable,
};

// Get position value for a piece
function getPositionValue(piece, square, isWhite, isEndgame = false) {
  let table = positionTables[piece];
  if (piece === 'k' && isEndgame) {
    table = kingEndgameTable;
  }
  if (!table) return 0;

  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  const index = isWhite ? (7 - rank) * 8 + file : rank * 8 + file;
  return table[index] || 0;
}

// Check if it's endgame
function isEndgame(game) {
  const board = game.board();
  let queens = 0;
  let minorPieces = 0;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        if (piece.type === 'q') queens++;
        if (piece.type === 'n' || piece.type === 'b') minorPieces++;
      }
    }
  }

  return queens === 0 || (queens <= 2 && minorPieces <= 4);
}

// Evaluate the board position
export function evaluateBoard(game) {
  if (game.in_checkmate()) {
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
    return 0;
  }

  let score = 0;
  const board = game.board();
  const endgame = isEndgame(game);

  // Material and position
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const square = String.fromCharCode(97 + j) + (8 - i);
        const pieceValue = pieceValues[piece.type] || 0;
        const positionValue = getPositionValue(piece.type, square, piece.color === 'w', endgame);

        if (piece.color === 'w') {
          score += pieceValue + positionValue;
        } else {
          score -= pieceValue + positionValue;
        }
      }
    }
  }

  // Mobility bonus (number of legal moves)
  const currentTurn = game.turn();
  const mobility = game.moves().length;
  score += (currentTurn === 'w' ? 1 : -1) * mobility * 2;

  // Check bonus
  if (game.in_check()) {
    score += currentTurn === 'w' ? -30 : 30;
  }

  return score;
}

// Convert evaluation score to win probability (sigmoid function)
export function scoreToWinProbability(score, forWhite = true) {
  const probability = 1 / (1 + Math.exp(-score / 400));
  return forWhite ? probability : 1 - probability;
}

// Order moves for better alpha-beta pruning
function orderMoves(game, moves) {
  const movesWithPriority = moves.map(move => {
    let priority = 0;
    const moveObj = game.move(move);

    // Checkmate is best
    if (game.in_checkmate()) priority = 10000;
    // Checks are good
    else if (game.in_check()) priority = 500;

    game.undo();

    // Parse move for captures
    if (typeof move === 'string') {
      if (move.includes('x')) {
        // Captures - prioritize by captured piece value
        priority += 400;
      }
      // Promotions
      if (move.includes('=')) priority += 800;
      // Castling
      if (move === 'O-O' || move === 'O-O-O') priority += 300;
    }

    return { move, priority };
  });

  // Sort by priority (highest first)
  movesWithPriority.sort((a, b) => b.priority - a.priority);
  return movesWithPriority.map(m => m.move);
}

// Quiescence search to avoid horizon effect
function quiescence(game, alpha, beta, isMaximizing, depth = 0) {
  const standPat = evaluateBoard(game);

  if (depth >= 2) return standPat; // Reduced depth for speed

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  // Only search captures
  const moves = game.moves({ verbose: true }).filter(m => m.captured);
  if (moves.length === 0) return standPat;

  for (const move of moves) {
    game.move(move.san);
    const score = quiescence(game, alpha, beta, !isMaximizing, depth + 1);
    game.undo();

    if (isMaximizing) {
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    } else {
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
  }

  return isMaximizing ? alpha : beta;
}

// Minimax with Alpha-Beta Pruning, Move Ordering, and Transposition Table
function minimax(game, depth, alpha, beta, isMaximizing, useQuiescence = true) {
  // Check transposition table
  const fen = game.fen();
  const cacheKey = `${fen}_${depth}_${isMaximizing}`;
  const cached = transpositionTable.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  if (depth === 0) {
    const score = useQuiescence
      ? quiescence(game, alpha, beta, isMaximizing)
      : evaluateBoard(game);
    return score;
  }

  if (game.game_over()) {
    return evaluateBoard(game);
  }

  const moves = orderMoves(game, game.moves());
  let result;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false, useQuiescence);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    result = maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, true, useQuiescence);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    result = minEval;
  }

  // Store in transposition table
  clearCacheIfNeeded();
  transpositionTable.set(cacheKey, result);

  return result;
}

// Get all moves with their evaluation scores
export function getMovesWithScores(game, depth = 3) {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return [];

  const isWhite = game.turn() === 'w';
  const movesWithScores = [];

  // Order moves first for better search
  const orderedMoves = orderMoves(game, moves.map(m => m.san));

  // Limit analysis to top candidates for speed
  const maxAnalyze = depth >= 4 ? 8 : 12;
  const movesToAnalyze = orderedMoves.slice(0, maxAnalyze);

  for (const moveSan of movesToAnalyze) {
    const move = moves.find(m => m.san === moveSan);
    game.move(moveSan);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isWhite, true);
    game.undo();

    movesWithScores.push({
      move: move,
      san: moveSan,
      score: score,
      winProbability: scoreToWinProbability(score, isWhite),
    });
  }

  // Sort by score (best first for current player)
  movesWithScores.sort((a, b) => {
    return isWhite ? b.score - a.score : a.score - b.score;
  });

  return movesWithScores;
}

// Get top N recommended moves with explanations
export function getTopMoves(game, n = 3, depth = 3) {
  const movesWithScores = getMovesWithScores(game, depth);
  return movesWithScores.slice(0, n).map((item, index) => ({
    ...item,
    rank: index + 1,
    explanation: generateMoveExplanation(game, item.move, item.score, index === 0),
  }));
}

// Generate explanation for a move
function generateMoveExplanation(game, move, score, isBest) {
  const reasons = [];
  const piece = pieceNames[move.piece] || 'Piece';

  // Check if it's a capture
  if (move.captured) {
    const capturedName = pieceNames[move.captured] || 'piece';
    const capturedValue = pieceValues[move.captured] || 0;
    const pieceValue = pieceValues[move.piece] || 0;

    if (capturedValue > pieceValue) {
      reasons.push(`Wins ${capturedName} (+${Math.round((capturedValue - pieceValue) / 100)} pawns)`);
    } else if (capturedValue === pieceValue) {
      reasons.push(`Trades ${piece} for ${capturedName}`);
    } else {
      reasons.push(`Captures ${capturedName}`);
    }
  }

  // Check if it gives check
  if (move.san.includes('+')) {
    reasons.push('Gives check');
  }

  // Check if it's checkmate
  if (move.san.includes('#')) {
    reasons.push('Checkmate!');
  }

  // Check if it's castling
  if (move.san === 'O-O') {
    reasons.push('Castles kingside for safety');
  } else if (move.san === 'O-O-O') {
    reasons.push('Castles queenside');
  }

  // Check for pawn promotion
  if (move.promotion) {
    const promotedTo = pieceNames[move.promotion] || 'piece';
    reasons.push(`Promotes to ${promotedTo}`);
  }

  // Center control (e4, d4, e5, d5)
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  if (centerSquares.includes(move.to) && move.piece === 'p') {
    reasons.push('Controls the center');
  }

  // Development (moving pieces from starting squares)
  const developmentSquares = {
    'b1': true, 'g1': true, 'b8': true, 'g8': true,
    'c1': true, 'f1': true, 'c8': true, 'f8': true,
  };
  if (developmentSquares[move.from] && (move.piece === 'n' || move.piece === 'b')) {
    reasons.push('Develops piece');
  }

  // If no specific reason, add position-based explanation
  if (reasons.length === 0) {
    if (isBest) {
      reasons.push('Best move - improves position');
    } else {
      reasons.push('Good alternative');
    }
  }

  return reasons.join(', ');
}

// Analyze the current position
export function analyzePosition(game) {
  const score = evaluateBoard(game);
  const isWhite = game.turn() === 'w';
  const winProb = scoreToWinProbability(score, true);

  let evaluation = '';
  let advantage = '';

  if (Math.abs(score) < 50) {
    evaluation = 'Equal position';
    advantage = 'even';
  } else if (score > 0) {
    if (score > 900) {
      evaluation = 'White is winning';
      advantage = 'white-winning';
    } else if (score > 300) {
      evaluation = 'White has clear advantage';
      advantage = 'white-better';
    } else {
      evaluation = 'White is slightly better';
      advantage = 'white-slight';
    }
  } else {
    if (score < -900) {
      evaluation = 'Black is winning';
      advantage = 'black-winning';
    } else if (score < -300) {
      evaluation = 'Black has clear advantage';
      advantage = 'black-better';
    } else {
      evaluation = 'Black is slightly better';
      advantage = 'black-slight';
    }
  }

  // Game state
  let gameState = '';
  if (game.in_checkmate()) {
    gameState = game.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  } else if (game.in_check()) {
    gameState = `${isWhite ? 'White' : 'Black'} is in check`;
  } else if (game.in_stalemate()) {
    gameState = 'Stalemate - Draw';
  } else if (game.in_draw()) {
    gameState = 'Draw';
  }

  return {
    score,
    scorePawns: (score / 100).toFixed(1),
    evaluation,
    advantage,
    gameState,
    winProbability: {
      white: winProb,
      black: 1 - winProb,
    },
    turn: isWhite ? 'white' : 'black',
  };
}

// Piece names in Chinese
const pieceNamesCN = {
  p: '兵',
  n: '马',
  b: '象',
  r: '车',
  q: '后',
  k: '王',
};

// Explain why a move was made (for AI moves) - Bilingual
export function explainAIMove(game, moveSan) {
  const moves = game.moves({ verbose: true });
  const move = moves.find(m => m.san === moveSan);

  if (!move) return '已走棋 / Move played.';

  const explanations = [];
  const piece = pieceNames[move.piece] || 'Piece';
  const pieceCN = pieceNamesCN[move.piece] || '棋子';

  // Capture explanation
  if (move.captured) {
    const capturedName = pieceNames[move.captured];
    const capturedNameCN = pieceNamesCN[move.captured];
    const capturedValue = pieceValues[move.captured];
    const pieceValue = pieceValues[move.piece];

    if (capturedValue > pieceValue) {
      const gain = Math.round((capturedValue - pieceValue) / 100);
      explanations.push(`🎯 赢子！${pieceCN}吃${capturedNameCN}（+${gain}兵价值）/ Winning material: ${piece} takes ${capturedName} (+${gain} pawns value)`);
    } else if (capturedValue === pieceValue) {
      explanations.push(`🔄 兑子：${pieceCN}吃${capturedNameCN} / Trading: ${piece} takes ${capturedName}`);
    } else {
      explanations.push(`⚔️ ${pieceCN}吃${capturedNameCN} / ${piece} captures ${capturedName}`);
    }
  }

  // Check/Checkmate
  if (moveSan.includes('#')) {
    explanations.push('👑 将死！游戏结束 / Checkmate! Game over.');
  } else if (moveSan.includes('+')) {
    explanations.push('⚠️ 将军！你必须保护你的王 / Check! You must defend your king.');
  }

  // Castling
  if (moveSan === 'O-O') {
    explanations.push('🏰 短易位：保护王并激活车 / Kingside castling for king safety and rook activation.');
  } else if (moveSan === 'O-O-O') {
    explanations.push('🏰 长易位：保护王并激活车 / Queenside castling for king safety and rook activation.');
  }

  // Promotion
  if (move.promotion) {
    const promoName = pieceNames[move.promotion];
    const promoNameCN = pieceNamesCN[move.promotion];
    explanations.push(`🎉 升变！兵升变为${promoNameCN} / Pawn promotes to ${promoName}!`);
  }

  // Center control
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  if (centerSquares.includes(move.to) && !move.captured) {
    explanations.push('🎯 控制中心 / Controlling the center.');
  }

  // Development
  if (['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1])) {
    explanations.push(`📈 出子：${pieceCN}开始活动 / Developing the ${piece}.`);
  }

  // Open file for rook
  if (move.piece === 'r') {
    const file = move.to[0];
    explanations.push(`📊 车占${file}列 / Rook controls the ${file}-file.`);
  }

  // Knight outpost
  if (move.piece === 'n' && ['4', '5'].includes(move.to[1])) {
    explanations.push(`🐴 马到前哨位置 / Knight reaches an outpost.`);
  }

  // Default explanation
  if (explanations.length === 0) {
    explanations.push(`${pieceCN}到${move.to}，改善位置 / ${piece} to ${move.to} - improving position.`);
  }

  return explanations.join(' ');
}

// Get strategic advice for current position (for coach mode)
export function getStrategicAdvice(game) {
  const advice = [];
  const fen = game.fen();
  const moveCount = game.history().length;

  // Opening phase advice
  if (moveCount < 10) {
    advice.push({
      cn: '开局阶段：专注于发展棋子和控制中心',
      en: 'Opening phase: Focus on developing pieces and controlling the center',
      priority: 'high'
    });

    // Check if castled
    if (!fen.includes('K') || fen.includes('K') && fen.includes('R')) {
      advice.push({
        cn: '考虑尽早王车易位保护你的王',
        en: 'Consider castling early to protect your king',
        priority: 'medium'
      });
    }
  }

  // Check for undefended pieces
  if (game.in_check()) {
    advice.push({
      cn: '你正在被将军！必须立即应对',
      en: 'You are in check! You must respond immediately',
      priority: 'critical'
    });
  }

  // Middlegame advice
  if (moveCount >= 10 && moveCount < 30) {
    advice.push({
      cn: '中局阶段：寻找战术机会和弱点',
      en: 'Middlegame phase: Look for tactical opportunities and weaknesses',
      priority: 'medium'
    });
  }

  // Endgame advice
  if (moveCount >= 30) {
    advice.push({
      cn: '残局阶段：激活你的王，推进兵',
      en: 'Endgame phase: Activate your king and push your pawns',
      priority: 'medium'
    });
  }

  return advice;
}

// Find the best move for the AI
export function findBestMove(game, depth = 3) {
  const moves = game.moves();
  if (moves.length === 0) return null;

  // Try opening book first for instant response
  const bookMove = getOpeningMove(game);
  if (bookMove) {
    return bookMove;
  }

  const isWhite = game.turn() === 'w';
  let bestMove = moves[0];
  let bestValue = isWhite ? -Infinity : Infinity;

  // Order moves for better search
  const orderedMoves = orderMoves(game, moves);

  // Limit search for faster response
  const maxMoves = depth >= 4 ? 15 : 20; // Search fewer moves at higher depths
  const movesToSearch = orderedMoves.slice(0, maxMoves);

  for (const move of movesToSearch) {
    game.move(move);
    const moveValue = minimax(game, depth - 1, -Infinity, Infinity, !isWhite, true);
    game.undo();

    if (isWhite) {
      if (moveValue > bestValue) {
        bestValue = moveValue;
        bestMove = move;
      }
    } else {
      if (moveValue < bestValue) {
        bestValue = moveValue;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

// Clear transposition table (call on new game)
export function clearCache() {
  transpositionTable.clear();
}

export default {
  findBestMove,
  evaluateBoard,
  getTopMoves,
  analyzePosition,
  explainAIMove,
  getStrategicAdvice,
  scoreToWinProbability,
  clearCache,
};
