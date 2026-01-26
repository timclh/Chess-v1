// Chess AI with Educational Features
// Uses Minimax with Alpha-Beta Pruning + Move Ordering + Quiescence Search

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

  if (depth >= 4) return standPat; // Limit quiescence depth

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

// Minimax with Alpha-Beta Pruning and Move Ordering
function minimax(game, depth, alpha, beta, isMaximizing, useQuiescence = true) {
  if (depth === 0) {
    return useQuiescence
      ? quiescence(game, alpha, beta, isMaximizing)
      : evaluateBoard(game);
  }

  if (game.game_over()) {
    return evaluateBoard(game);
  }

  const moves = orderMoves(game, game.moves());

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
    return maxEval;
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
    return minEval;
  }
}

// Get all moves with their evaluation scores
export function getMovesWithScores(game, depth = 3) {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return [];

  const isWhite = game.turn() === 'w';
  const movesWithScores = [];

  // Order moves first for better search
  const orderedMoves = orderMoves(game, moves.map(m => m.san));

  for (const moveSan of orderedMoves) {
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

// Explain why a move was made (for AI moves)
export function explainAIMove(game, moveSan) {
  const moves = game.moves({ verbose: true });
  const move = moves.find(m => m.san === moveSan);

  if (!move) return 'Move played.';

  const explanations = [];
  const piece = pieceNames[move.piece] || 'Piece';

  // Capture explanation
  if (move.captured) {
    const capturedName = pieceNames[move.captured];
    const capturedValue = pieceValues[move.captured];
    const pieceValue = pieceValues[move.piece];

    if (capturedValue > pieceValue) {
      explanations.push(`Winning material: ${piece} takes ${capturedName} (+${Math.round((capturedValue - pieceValue) / 100)} pawns value)`);
    } else if (capturedValue === pieceValue) {
      explanations.push(`Trading: ${piece} takes ${capturedName}`);
    } else {
      explanations.push(`${piece} captures ${capturedName}`);
    }
  }

  // Check/Checkmate
  if (moveSan.includes('#')) {
    explanations.push('Checkmate! Game over.');
  } else if (moveSan.includes('+')) {
    explanations.push('Check! You must defend your king.');
  }

  // Castling
  if (moveSan === 'O-O' || moveSan === 'O-O-O') {
    explanations.push('Castling for king safety and rook activation.');
  }

  // Promotion
  if (move.promotion) {
    explanations.push(`Pawn promotes to ${pieceNames[move.promotion]}!`);
  }

  // Center control
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  if (centerSquares.includes(move.to)) {
    explanations.push('Controlling the center.');
  }

  // Development
  if (['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1])) {
    explanations.push('Developing a piece.');
  }

  // Default explanation
  if (explanations.length === 0) {
    explanations.push(`${piece} to ${move.to} - improving position.`);
  }

  return explanations.join(' ');
}

// Find the best move for the AI
export function findBestMove(game, depth = 3) {
  const moves = game.moves();
  if (moves.length === 0) return null;

  const isWhite = game.turn() === 'w';
  let bestMove = moves[0];
  let bestValue = isWhite ? -Infinity : Infinity;

  // Order moves for better search
  const orderedMoves = orderMoves(game, moves);

  for (const move of orderedMoves) {
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

export default {
  findBestMove,
  evaluateBoard,
  getTopMoves,
  analyzePosition,
  explainAIMove,
  scoreToWinProbability,
};
