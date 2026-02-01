/**
 * Xiangqi (Chinese Chess) AI
 * 中国象棋 AI - 使用 Minimax 算法和 Alpha-Beta 剪枝
 */

import Xiangqi, { PIECE_NAMES } from './xiangqi';

// Piece values (in centipawns-like units)
const PIECE_VALUES = {
  k: 10000, // General - 将/帅
  a: 200,   // Advisor - 士/仕
  e: 200,   // Elephant - 象/相
  h: 400,   // Horse - 马
  r: 900,   // Chariot - 车
  c: 450,   // Cannon - 炮
  s: 100,   // Soldier - 兵/卒 (increases after crossing river)
};

// Position tables for piece-square bonuses (from red's perspective, row 0-9, col 0-8)
// Values encourage good positioning

// General (帅/将) - stay in center of palace
const GENERAL_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 0, 0, 0],
  [0, 0, 0, -8, -8, -8, 0, 0, 0],
  [0, 0, 0, 1, 8, 1, 0, 0, 0],
];

// Advisor (仕/士) - stay in palace corners
const ADVISOR_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 20, 0, 20, 0, 0, 0],
  [0, 0, 0, 0, 25, 0, 0, 0, 0],
  [0, 0, 0, 20, 0, 20, 0, 0, 0],
];

// Elephant (相/象) - protect the general, control key points
const ELEPHANT_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 20, 0, 0, 0, 20, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [18, 0, 0, 0, 25, 0, 0, 0, 18],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 20, 0, 0, 0, 20, 0, 0],
];

// Horse (马) - control center, avoid edges
const HORSE_TABLE = [
  [0, -4, 0, 0, 0, 0, 0, -4, 0],
  [0, 2, 4, 4, -2, 4, 4, 2, 0],
  [4, 2, 8, 8, 4, 8, 8, 2, 4],
  [2, 6, 8, 6, 10, 6, 8, 6, 2],
  [4, 12, 16, 14, 12, 14, 16, 12, 4],
  [6, 16, 14, 18, 16, 18, 14, 16, 6],
  [8, 24, 18, 24, 20, 24, 18, 24, 8],
  [12, 14, 16, 20, 18, 20, 16, 14, 12],
  [4, 10, 28, 16, 8, 16, 28, 10, 4],
  [4, 8, 16, 12, 4, 12, 16, 8, 4],
];

// Chariot (车) - most valuable piece, control files and ranks
const CHARIOT_TABLE = [
  [14, 14, 12, 18, 16, 18, 12, 14, 14],
  [16, 20, 18, 24, 26, 24, 18, 20, 16],
  [12, 12, 12, 18, 18, 18, 12, 12, 12],
  [12, 18, 16, 22, 22, 22, 16, 18, 12],
  [12, 14, 12, 18, 18, 18, 12, 14, 12],
  [12, 16, 14, 20, 20, 20, 14, 16, 12],
  [6, 10, 8, 14, 14, 14, 8, 10, 6],
  [4, 8, 6, 14, 12, 14, 6, 8, 4],
  [8, 4, 8, 16, 8, 16, 8, 4, 8],
  [-2, 10, 6, 14, 12, 14, 6, 10, -2],
];

// Cannon (炮) - control center in opening, flexible positioning
const CANNON_TABLE = [
  [6, 4, 0, -10, -12, -10, 0, 4, 6],
  [2, 2, 0, -4, -14, -4, 0, 2, 2],
  [2, 2, 0, -10, -8, -10, 0, 2, 2],
  [0, 0, -2, 4, 10, 4, -2, 0, 0],
  [0, 0, 0, 2, 8, 2, 0, 0, 0],
  [-2, 0, 4, 2, 6, 2, 4, 0, -2],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [4, 0, 8, 6, 10, 6, 8, 0, 4],
  [0, 2, 4, 6, 6, 6, 4, 2, 0],
  [0, 0, 2, 6, 6, 6, 2, 0, 0],
];

// Soldier (兵/卒) - value increases after crossing river
const SOLDIER_TABLE = [
  [0, 3, 6, 9, 12, 9, 6, 3, 0],
  [18, 36, 56, 80, 120, 80, 56, 36, 18],
  [14, 26, 42, 60, 80, 60, 42, 26, 14],
  [10, 20, 30, 34, 40, 34, 30, 20, 10],
  [6, 12, 18, 18, 20, 18, 18, 12, 6],
  [2, 0, 8, 0, 8, 0, 8, 0, 2],
  [0, 0, -2, 0, 4, 0, -2, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const POSITION_TABLES = {
  k: GENERAL_TABLE,
  a: ADVISOR_TABLE,
  e: ELEPHANT_TABLE,
  h: HORSE_TABLE,
  r: CHARIOT_TABLE,
  c: CANNON_TABLE,
  s: SOLDIER_TABLE,
};

// Cache for transposition table
const transpositionTable = new Map();
const MAX_CACHE_SIZE = 100000;

// Evaluate a position from red's perspective
function evaluate(game) {
  let score = 0;
  const board = game.board;

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const pieceValue = PIECE_VALUES[piece.type];
      const positionTable = POSITION_TABLES[piece.type];

      let positionBonus = 0;
      if (piece.color === 'r') {
        // Red pieces - use table directly
        positionBonus = positionTable[row][col];
        score += pieceValue + positionBonus;
      } else {
        // Black pieces - mirror the table
        positionBonus = positionTable[9 - row][8 - col];
        score -= pieceValue + positionBonus;
      }
    }
  }

  // Bonus for check
  if (game.in_check()) {
    score += game.turn === 'r' ? -50 : 50;
  }

  // Bonus for checkmate
  if (game.in_checkmate()) {
    score += game.turn === 'r' ? -100000 : 100000;
  }

  return score;
}

// Quick evaluation for sorting moves
function quickEvaluate(game) {
  const score = evaluate(game);
  const winProb = 1 / (1 + Math.exp(-score / 400));
  return {
    score,
    winProbability: winProb,
  };
}

// Minimax with alpha-beta pruning
function minimax(game, depth, alpha, beta, maximizing, startTime, timeLimit) {
  // Check time limit
  if (Date.now() - startTime > timeLimit) {
    return { score: evaluate(game), timeout: true };
  }

  // Check transposition table
  const fen = game.toFEN() + game.turn;
  const cached = transpositionTable.get(fen);
  if (cached && cached.depth >= depth) {
    return cached;
  }

  if (depth === 0 || game.game_over()) {
    const score = evaluate(game);
    return { score };
  }

  const moves = game.moves({ verbose: true });

  // Move ordering: captures first, then checks
  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10;
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10;
    return scoreB - scoreA;
  });

  let bestMove = moves[0];

  if (maximizing) {
    let maxEval = -Infinity;

    for (const move of moves) {
      const newGame = cloneGame(game);
      newGame.move(move);

      const result = minimax(newGame, depth - 1, alpha, beta, false, startTime, timeLimit);

      if (result.timeout) return result;

      if (result.score > maxEval) {
        maxEval = result.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }

    const cacheEntry = { score: maxEval, depth, move: bestMove };
    if (transpositionTable.size < MAX_CACHE_SIZE) {
      transpositionTable.set(fen, cacheEntry);
    }

    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;

    for (const move of moves) {
      const newGame = cloneGame(game);
      newGame.move(move);

      const result = minimax(newGame, depth - 1, alpha, beta, true, startTime, timeLimit);

      if (result.timeout) return result;

      if (result.score < minEval) {
        minEval = result.score;
        bestMove = move;
      }

      beta = Math.min(beta, result.score);
      if (beta <= alpha) break;
    }

    const cacheEntry = { score: minEval, depth, move: bestMove };
    if (transpositionTable.size < MAX_CACHE_SIZE) {
      transpositionTable.set(fen, cacheEntry);
    }

    return { score: minEval, move: bestMove };
  }
}

// Clone game state
function cloneGame(game) {
  const newGame = new Xiangqi(game.toFEN());
  newGame.turn = game.turn;
  return newGame;
}

// Find best move
function findBestMove(game, difficulty = 2) {
  const depths = { 1: 2, 2: 3, 3: 4, 4: 5 };
  const timeLimits = { 1: 1000, 2: 2000, 3: 4000, 4: 8000 };

  const depth = depths[difficulty] || 3;
  const timeLimit = timeLimits[difficulty] || 2000;
  const startTime = Date.now();

  const maximizing = game.turn === 'r';
  const result = minimax(game, depth, -Infinity, Infinity, maximizing, startTime, timeLimit);

  // Add some randomness at lower difficulties
  if (difficulty <= 2 && Math.random() < 0.15) {
    const moves = game.moves({ verbose: true });
    if (moves.length > 1) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return randomMove;
    }
  }

  return result.move || game.moves({ verbose: true })[0];
}

// Get top N moves for coach mode
function getTopMoves(game, n = 3, difficulty = 2) {
  const moves = game.moves({ verbose: true });
  const evaluatedMoves = [];

  for (const move of moves) {
    const newGame = cloneGame(game);
    newGame.move(move);
    const score = evaluate(newGame);
    const adjustedScore = game.turn === 'r' ? score : -score;

    evaluatedMoves.push({
      move,
      score: adjustedScore,
      san: move.san,
    });
  }

  // Sort by score
  evaluatedMoves.sort((a, b) => b.score - a.score);

  // Take top N
  return evaluatedMoves.slice(0, n).map((item, index) => {
    const winProb = 1 / (1 + Math.exp(-item.score / 400));
    return {
      rank: index + 1,
      move: item.move,
      san: item.san,
      score: item.score,
      winProbability: winProb,
      explanation: getMoveExplanation(item.move),
    };
  });
}

// Get explanation for a move
function getMoveExplanation(move) {
  const pieceNameCn = PIECE_NAMES[move.piece][move.color];
  let explanation = '';

  if (move.captured) {
    const capturedName = PIECE_NAMES[move.captured][move.color === 'r' ? 'b' : 'r'];
    explanation = `${pieceNameCn}吃${capturedName} / Capture ${capturedName}`;
  } else {
    explanation = `${pieceNameCn}移动 / ${pieceNameCn} move`;
  }

  return explanation;
}

// Analyze position
function analyzePosition(game) {
  const score = evaluate(game);
  const winProb = 1 / (1 + Math.exp(-score / 400));

  let evaluation = '';
  if (Math.abs(score) < 50) {
    evaluation = '局面均势 / Equal position';
  } else if (score > 300) {
    evaluation = '红方优势 / Red advantage';
  } else if (score > 100) {
    evaluation = '红方稍优 / Red slightly better';
  } else if (score < -300) {
    evaluation = '黑方优势 / Black advantage';
  } else if (score < -100) {
    evaluation = '黑方稍优 / Black slightly better';
  } else if (score > 0) {
    evaluation = '红方略优 / Red edge';
  } else {
    evaluation = '黑方略优 / Black edge';
  }

  return {
    score,
    evaluation,
    winProbability: {
      red: winProb,
      black: 1 - winProb,
    },
  };
}

// Get strategic advice for coach mode
function getStrategicAdvice(game) {
  const advice = [];
  const board = game.board;
  const turn = game.turn;
  const turnName = turn === 'r' ? '红方' : '黑方';

  // Check detection
  if (game.in_check()) {
    advice.push({
      cn: `⚠️ ${turnName}被将军！必须应将`,
      en: `${turn === 'r' ? 'Red' : 'Black'} is in check! Must respond`,
      priority: 'critical',
    });
    return advice;
  }

  // Count pieces
  let redPieces = { total: 0, r: 0, h: 0, c: 0, s: 0 };
  let blackPieces = { total: 0, r: 0, h: 0, c: 0, s: 0 };

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      if (piece.color === 'r') {
        redPieces.total++;
        if (redPieces[piece.type] !== undefined) redPieces[piece.type]++;
      } else {
        blackPieces.total++;
        if (blackPieces[piece.type] !== undefined) blackPieces[piece.type]++;
      }
    }
  }

  const myPieces = turn === 'r' ? redPieces : blackPieces;
  const oppPieces = turn === 'r' ? blackPieces : redPieces;

  // Phase detection
  const totalPieces = redPieces.total + blackPieces.total;
  const isOpening = totalPieces >= 28;
  const isEndgame = totalPieces <= 14;

  if (isOpening) {
    // Opening advice
    if (myPieces.c === 2) {
      advice.push({
        cn: '💡 开局阶段：可以考虑当头炮或仕角炮开局',
        en: 'Opening: Consider central cannon or palace corner cannon',
        priority: 'medium',
      });
    }

    if (myPieces.h === 2) {
      advice.push({
        cn: '💡 及时出动双马，控制中心',
        en: 'Develop both horses to control the center',
        priority: 'medium',
      });
    }

    advice.push({
      cn: '💡 保护好将帅，注意士象的防守',
      en: 'Protect the general, maintain advisor and elephant defense',
      priority: 'medium',
    });
  } else if (isEndgame) {
    // Endgame advice
    if (myPieces.r > 0) {
      advice.push({
        cn: '💡 残局中车是最强的子力，要充分发挥车的作用',
        en: 'In endgame, the chariot is most powerful. Use it actively',
        priority: 'high',
      });
    }

    if (myPieces.s > 0) {
      advice.push({
        cn: '💡 过河卒子价值大增，可以配合其他子力进攻',
        en: 'Crossed soldiers are very valuable for attack',
        priority: 'medium',
      });
    }
  } else {
    // Middle game
    if (myPieces.r > oppPieces.r) {
      advice.push({
        cn: '💡 你有车的优势，应积极进攻',
        en: 'You have chariot advantage, attack actively',
        priority: 'high',
      });
    }

    if (myPieces.c > 0) {
      advice.push({
        cn: '💡 炮需要炮架才能发挥威力，注意配合',
        en: 'Cannons need platforms to be effective, coordinate pieces',
        priority: 'medium',
      });
    }
  }

  // Material advice
  const materialDiff = (myPieces.r - oppPieces.r) * 9 +
                       (myPieces.h - oppPieces.h) * 4 +
                       (myPieces.c - oppPieces.c) * 4.5;

  if (materialDiff > 5) {
    advice.push({
      cn: '✅ 你有子力优势，可以考虑兑子简化局面',
      en: 'You have material advantage, consider trading pieces',
      priority: 'high',
    });
  } else if (materialDiff < -5) {
    advice.push({
      cn: '⚠️ 对方子力占优，需要寻找战术机会',
      en: 'Opponent has material advantage, look for tactics',
      priority: 'high',
    });
  }

  return advice;
}

// Explain AI move
function explainAIMove(game, move) {
  const pieceNameCn = PIECE_NAMES[move.piece][move.color];

  if (move.captured) {
    const capturedName = PIECE_NAMES[move.captured][move.color === 'r' ? 'b' : 'r'];
    return `AI用${pieceNameCn}吃掉了${capturedName}，获取子力优势。\nAI captured ${capturedName} with ${pieceNameCn} for material gain.`;
  }

  // Check if the move gives check
  const newGame = cloneGame(game);
  newGame.move(move);
  if (newGame.in_check()) {
    return `AI移动${pieceNameCn}将军！\nAI moved ${pieceNameCn} giving check!`;
  }

  return `AI移动${pieceNameCn}改善局面。\nAI moved ${pieceNameCn} to improve position.`;
}

// Clear cache
function clearCache() {
  transpositionTable.clear();
}

export {
  findBestMove,
  getTopMoves,
  analyzePosition,
  getStrategicAdvice,
  explainAIMove,
  quickEvaluate,
  evaluate,
  clearCache,
  PIECE_VALUES,
};
