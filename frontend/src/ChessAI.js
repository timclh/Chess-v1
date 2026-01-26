// Chess AI with Educational Features
// Uses Minimax with Alpha-Beta Pruning + Move Analysis

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

const positionTables = {
  p: pawnTable,
  n: knightTable,
  b: bishopTable,
  r: rookTable,
  q: queenTable,
  k: kingMiddleTable,
};

// Get position value for a piece
function getPositionValue(piece, square, isWhite) {
  const table = positionTables[piece];
  if (!table) return 0;

  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  const index = isWhite ? (7 - rank) * 8 + file : rank * 8 + file;
  return table[index] || 0;
}

// Evaluate the board position
export function evaluateBoard(game) {
  if (game.in_checkmate()) {
    return game.turn() === 'w' ? -Infinity : Infinity;
  }
  if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
    return 0;
  }

  let score = 0;
  const board = game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const square = String.fromCharCode(97 + j) + (8 - i);
        const pieceValue = pieceValues[piece.type] || 0;
        const positionValue = getPositionValue(piece.type, square, piece.color === 'w');

        if (piece.color === 'w') {
          score += pieceValue + positionValue;
        } else {
          score -= pieceValue + positionValue;
        }
      }
    }
  }

  return score;
}

// Convert evaluation score to win probability (sigmoid function)
export function scoreToWinProbability(score, forWhite = true) {
  // Use sigmoid function: 1 / (1 + e^(-score/400))
  // 400 is a scaling factor (roughly 4 pawns = ~90% win probability)
  const probability = 1 / (1 + Math.exp(-score / 400));
  return forWhite ? probability : 1 - probability;
}

// Minimax with Alpha-Beta Pruning
function minimax(game, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || game.game_over()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false);
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
      const evalScore = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Get all moves with their evaluation scores
export function getMovesWithScores(game, depth = 2) {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return [];

  const isWhite = game.turn() === 'w';
  const movesWithScores = [];

  for (const move of moves) {
    game.move(move.san);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
    game.undo();

    movesWithScores.push({
      move: move,
      san: move.san,
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
export function getTopMoves(game, n = 3, depth = 2) {
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
    reasons.push(`Captures ${capturedName}`);
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
    reasons.push('Castles queenside for safety');
  }

  // Check for pawn promotion
  if (move.promotion) {
    const promotedTo = pieceNames[move.promotion] || 'piece';
    reasons.push(`Promotes to ${promotedTo}`);
  }

  // Center control (e4, d4, e5, d5)
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  if (centerSquares.includes(move.to)) {
    reasons.push('Controls the center');
  }

  // Development (moving pieces from starting squares)
  const developmentSquares = {
    'b1': 'knight', 'g1': 'knight', 'b8': 'knight', 'g8': 'knight',
    'c1': 'bishop', 'f1': 'bishop', 'c8': 'bishop', 'f8': 'bishop',
  };
  if (developmentSquares[move.from]) {
    reasons.push('Develops a piece');
  }

  // If no specific reason, add position-based explanation
  if (reasons.length === 0) {
    if (isBest) {
      reasons.push('Improves position');
    } else {
      reasons.push('Alternative option');
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
      evaluation = 'White has decisive advantage';
      advantage = 'white-winning';
    } else if (score > 300) {
      evaluation = 'White has significant advantage';
      advantage = 'white-better';
    } else {
      evaluation = 'White has slight advantage';
      advantage = 'white-slight';
    }
  } else {
    if (score < -900) {
      evaluation = 'Black has decisive advantage';
      advantage = 'black-winning';
    } else if (score < -300) {
      evaluation = 'Black has significant advantage';
      advantage = 'black-better';
    } else {
      evaluation = 'Black has slight advantage';
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
  // Get the move details
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
      explanations.push(`Great trade! ${piece} captures ${capturedName} (gaining ${((capturedValue - pieceValue) / 100).toFixed(0)} pawns worth of material)`);
    } else if (capturedValue === pieceValue) {
      explanations.push(`Equal trade: ${piece} captures ${capturedName}`);
    } else {
      explanations.push(`${piece} captures ${capturedName}`);
    }
  }

  // Check/Checkmate
  if (moveSan.includes('#')) {
    explanations.push('Checkmate! Game over.');
  } else if (moveSan.includes('+')) {
    explanations.push('Putting your king in check - you must respond to the threat.');
  }

  // Castling
  if (moveSan === 'O-O' || moveSan === 'O-O-O') {
    explanations.push('Castling to protect the king and connect the rooks.');
  }

  // Promotion
  if (move.promotion) {
    explanations.push(`Pawn promotes to ${pieceNames[move.promotion]} - a powerful upgrade!`);
  }

  // Center control
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  if (centerSquares.includes(move.to)) {
    explanations.push('Taking control of the center, which is strategically important.');
  }

  // Development
  if (['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1])) {
    explanations.push('Developing a piece to a more active square.');
  }

  // Default explanation
  if (explanations.length === 0) {
    explanations.push(`${piece} moves to ${move.to} to improve its position.`);
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

  const shuffledMoves = moves.sort(() => Math.random() - 0.5);

  for (const move of shuffledMoves) {
    game.move(move);
    const moveValue = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
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
