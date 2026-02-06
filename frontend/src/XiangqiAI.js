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

// Opening book - key is FEN, value is array of good moves with scores
// Higher score = better move
const OPENING_BOOK = {
  // Initial position - Red's first move
  'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR': [
    { from: 'b2', to: 'e2', score: 100, name: '当头炮', nameEn: 'Central Cannon' },
    { from: 'h2', to: 'e2', score: 100, name: '当头炮', nameEn: 'Central Cannon' },
    { from: 'b2', to: 'd2', score: 90, name: '仕角炮', nameEn: 'Palace Corner Cannon' },
    { from: 'h2', to: 'f2', score: 90, name: '仕角炮', nameEn: 'Palace Corner Cannon' },
    { from: 'b0', to: 'c2', score: 85, name: '出马', nameEn: 'Develop Horse' },
    { from: 'h0', to: 'g2', score: 85, name: '出马', nameEn: 'Develop Horse' },
    { from: 'b2', to: 'b4', score: 80, name: '巡河炮', nameEn: 'Patrolling Cannon' },
    { from: 'h2', to: 'h4', score: 80, name: '巡河炮', nameEn: 'Patrolling Cannon' },
  ],
  // After Red Central Cannon - Black's response
  'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/4C3C/9/RHEAKAEHR': [
    { from: 'h9', to: 'g7', score: 100, name: '屏风马', nameEn: 'Screen Horse' },
    { from: 'b9', to: 'c7', score: 100, name: '屏风马', nameEn: 'Screen Horse' },
    { from: 'b7', to: 'e7', score: 90, name: '顺炮', nameEn: 'Same Direction Cannon' },
    { from: 'h7', to: 'e7', score: 85, name: '列炮', nameEn: 'Opposite Cannon' },
  ],
  // Red with central cannon, black screen horse
  'rheakaehr/9/1c4Nc1/s1s1s1s1s/9/9/S1S1S1S1S/4C3C/9/RHEAKAEHR': [
    { from: 'h9', to: 'g7', score: 95, name: '双马', nameEn: 'Double Horse' },
    { from: 'b7', to: 'd7', score: 90, name: '过宫炮', nameEn: 'Transverse Cannon' },
  ],
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

// Check if we're in opening phase (most pieces still present)
function isOpeningPhase(game) {
  let pieceCount = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      if (game.board[row][col]) pieceCount++;
    }
  }
  return pieceCount >= 28; // 32 initial pieces, opening if >= 28
}

// Get opening book move if available
function getOpeningBookMove(game) {
  const fen = game.toFEN();
  const bookMoves = OPENING_BOOK[fen];
  if (!bookMoves || bookMoves.length === 0) return null;

  // Validate that the book move is actually legal
  const legalMoves = game.moves({ verbose: true });
  const validBookMoves = bookMoves.filter(bm =>
    legalMoves.some(lm => lm.from === bm.from && lm.to === bm.to)
  );

  if (validBookMoves.length === 0) return null;

  // Add some randomness among top book moves
  const topMoves = validBookMoves.filter(m => m.score >= validBookMoves[0].score - 10);
  return topMoves[Math.floor(Math.random() * topMoves.length)];
}

// Opening-specific evaluation bonuses
function evaluateOpening(game) {
  let bonus = 0;
  const board = game.board;

  // Bonus for developed pieces (horses and cannons moved from starting)
  // Red horses at b0 and h0, black horses at b9 and h9
  // Red cannons at b2 and h2, black cannons at b7 and h7

  // Red piece development
  if (!board[9][1] || board[9][1].type !== 'h') bonus += 15; // Left horse developed
  if (!board[9][7] || board[9][7].type !== 'h') bonus += 15; // Right horse developed
  if (!board[7][1] || board[7][1].type !== 'c') bonus += 10; // Left cannon developed
  if (!board[7][7] || board[7][7].type !== 'c') bonus += 10; // Right cannon developed

  // Central cannon bonus (cannon on e file)
  for (let row = 5; row < 10; row++) {
    const piece = board[row][4]; // e file
    if (piece && piece.type === 'c' && piece.color === 'r') {
      bonus += 25; // Central cannon is very strong in opening
    }
  }

  // Black piece development (negative because we evaluate from red's perspective)
  if (!board[0][1] || board[0][1].type !== 'h') bonus -= 15;
  if (!board[0][7] || board[0][7].type !== 'h') bonus -= 15;
  if (!board[2][1] || board[2][1].type !== 'c') bonus -= 10;
  if (!board[2][7] || board[2][7].type !== 'c') bonus -= 10;

  // Black central cannon
  for (let row = 0; row < 5; row++) {
    const piece = board[row][4];
    if (piece && piece.type === 'c' && piece.color === 'b') {
      bonus -= 25;
    }
  }

  // Penalize early chariot moves that don't control important files
  // Early chariot out can be bad without proper development

  // Bonus for connected rooks on back rank
  let redRooksConnected = true;
  let blackRooksConnected = true;

  // Check if red back rank has no pieces between rooks
  for (let col = 1; col < 8; col++) {
    if (board[9][col] && board[9][col].type !== 'r') {
      if (board[9][col].type === 'k' || board[9][col].type === 'a' || board[9][col].type === 'e') continue;
      redRooksConnected = false;
      break;
    }
  }
  if (redRooksConnected) bonus += 10;

  return bonus;
}

// Evaluate a position from red's perspective
function evaluate(game) {
  let score = 0;
  const board = game.board;
  const inOpening = isOpeningPhase(game);

  // Piece counts for endgame detection
  let redMaterial = 0;
  let blackMaterial = 0;
  let redChariots = 0, blackChariots = 0;
  let redCannons = 0, blackCannons = 0;
  let redHorses = 0, blackHorses = 0;

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
        redMaterial += pieceValue;
        if (piece.type === 'r') redChariots++;
        if (piece.type === 'c') redCannons++;
        if (piece.type === 'h') redHorses++;
      } else {
        // Black pieces - mirror the table
        positionBonus = positionTable[9 - row][8 - col];
        score -= pieceValue + positionBonus;
        blackMaterial += pieceValue;
        if (piece.type === 'r') blackChariots++;
        if (piece.type === 'c') blackCannons++;
        if (piece.type === 'h') blackHorses++;
      }
    }
  }

  // Add opening-specific evaluation
  if (inOpening) {
    score += evaluateOpening(game);
  }

  // King safety evaluation
  score += evaluateKingSafety(board, 'r') - evaluateKingSafety(board, 'b');

  // Chariot on open file bonus
  score += evaluateChariotActivity(board, 'r') - evaluateChariotActivity(board, 'b');

  // Mobility bonus (rough estimate)
  const redMoves = game.turn === 'r' ? game.moves().length : 0;
  score += redMoves * 2;

  // Endgame adjustments
  const totalMaterial = redMaterial + blackMaterial;
  if (totalMaterial < 4000) {
    // In endgame, connected passed soldiers are very valuable
    score += evaluateEndgame(board, 'r') - evaluateEndgame(board, 'b');
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

// Evaluate king safety
function evaluateKingSafety(board, color) {
  let safety = 0;
  
  // Find king position
  let kingRow = -1, kingCol = -1;
  for (let row = 0; row < 10; row++) {
    for (let col = 3; col <= 5; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'k' && piece.color === color) {
        kingRow = row;
        kingCol = col;
        break;
      }
    }
    if (kingRow >= 0) break;
  }
  
  if (kingRow < 0) return -1000; // King not found (should not happen)

  // Bonus for having advisors
  const palaceRows = color === 'r' ? [7, 8, 9] : [0, 1, 2];
  let advisorCount = 0;
  let elephantCount = 0;
  
  for (const row of palaceRows) {
    for (let col = 3; col <= 5; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        if (piece.type === 'a') advisorCount++;
        if (piece.type === 'e') elephantCount++;
      }
    }
  }
  
  safety += advisorCount * 30;
  safety += elephantCount * 20;

  // Penalty if king is exposed on file (flying general threat)
  const enemyKingRow = color === 'r' ? [0, 1, 2] : [7, 8, 9];
  let blockerCount = 0;
  const minRow = Math.min(kingRow, ...enemyKingRow);
  const maxRow = Math.max(kingRow, ...enemyKingRow);
  
  for (let row = minRow + 1; row < maxRow; row++) {
    if (board[row][kingCol]) blockerCount++;
  }
  
  if (blockerCount === 0) {
    safety -= 50; // Vulnerable to flying general attacks
  }

  return safety;
}

// Evaluate chariot activity
function evaluateChariotActivity(board, color) {
  let activity = 0;
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'r' && piece.color === color) {
        // Bonus for being on open file
        let openFile = true;
        for (let r = 0; r < 10; r++) {
          if (r !== row && board[r][col] && board[r][col].type === 's') {
            openFile = false;
            break;
          }
        }
        if (openFile) activity += 20;
        
        // Bonus for penetrating enemy territory
        if (color === 'r' && row <= 4) activity += 15;
        if (color === 'b' && row >= 5) activity += 15;
        
        // Bonus for being on 7th/3rd rank (near enemy palace)
        if (color === 'r' && row <= 2) activity += 25;
        if (color === 'b' && row >= 7) activity += 25;
      }
    }
  }
  
  return activity;
}

// Evaluate endgame factors
function evaluateEndgame(board, color) {
  let bonus = 0;
  
  // Find king and promote passed soldiers
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 's' && piece.color === color) {
        // Soldier in enemy territory
        if (color === 'r' && row <= 4) {
          bonus += (5 - row) * 10; // More advanced = more valuable
        }
        if (color === 'b' && row >= 5) {
          bonus += (row - 4) * 10;
        }
      }
    }
  }
  
  return bonus;
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

// Quiescence search - continue searching captures to avoid horizon effect
function quiescence(game, alpha, beta, maximizing, startTime, timeLimit, qDepth = 0) {
  // Limit quiescence depth
  if (qDepth > 6 || Date.now() - startTime > timeLimit) {
    return evaluate(game);
  }

  const standPat = evaluate(game);
  
  if (maximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  // Only search captures and checks
  const allMoves = game.moves({ verbose: true });
  const tacticalMoves = allMoves.filter(m => m.captured);
  
  // Sort by MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  tacticalMoves.sort((a, b) => {
    const scoreA = PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    const scoreB = PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    return scoreB - scoreA;
  });

  for (const move of tacticalMoves) {
    const newGame = cloneGame(game);
    newGame.move(move);
    
    const score = quiescence(newGame, alpha, beta, !maximizing, startTime, timeLimit, qDepth + 1);
    
    if (maximizing) {
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    } else {
      if (score < beta) beta = score;
      if (beta <= alpha) break;
    }
  }
  
  return maximizing ? alpha : beta;
}

// Killer moves for better move ordering (moves that caused cutoffs)
const killerMoves = new Array(20).fill(null).map(() => [null, null]);

// History heuristic for move ordering
const historyTable = {};

function updateHistory(move, depth) {
  const key = `${move.from}-${move.to}`;
  historyTable[key] = (historyTable[key] || 0) + depth * depth;
}

function getHistoryScore(move) {
  const key = `${move.from}-${move.to}`;
  return historyTable[key] || 0;
}

// Minimax with alpha-beta pruning and advanced features
function minimax(game, depth, alpha, beta, maximizing, startTime, timeLimit, ply = 0) {
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

  if (game.game_over()) {
    if (game.in_checkmate()) {
      // Return mate score adjusted by ply (prefer faster mates)
      return { score: maximizing ? -100000 + ply : 100000 - ply };
    }
    return { score: 0 }; // Stalemate
  }

  if (depth === 0) {
    // Use quiescence search instead of static eval
    const score = quiescence(game, alpha, beta, maximizing, startTime, timeLimit);
    return { score };
  }

  const moves = game.moves({ verbose: true });

  // Advanced move ordering for better pruning
  // 1. Captures sorted by MVV-LVA
  // 2. Killer moves
  // 3. History heuristic
  // 4. Other moves
  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    
    // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 100 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 100 - PIECE_VALUES[b.piece];
    
    // Killer moves bonus
    const killerSlot = killerMoves[ply];
    if (killerSlot) {
      if (killerSlot[0] && killerSlot[0].from === a.from && killerSlot[0].to === a.to) scoreA += 5000;
      if (killerSlot[1] && killerSlot[1].from === a.from && killerSlot[1].to === a.to) scoreA += 4000;
      if (killerSlot[0] && killerSlot[0].from === b.from && killerSlot[0].to === b.to) scoreB += 5000;
      if (killerSlot[1] && killerSlot[1].from === b.from && killerSlot[1].to === b.to) scoreB += 4000;
    }
    
    // History heuristic
    scoreA += getHistoryScore(a);
    scoreB += getHistoryScore(b);
    
    return scoreB - scoreA;
  });

  let bestMove = moves[0];

  if (maximizing) {
    let maxEval = -Infinity;

    for (const move of moves) {
      const newGame = cloneGame(game);
      newGame.move(move);

      const result = minimax(newGame, depth - 1, alpha, beta, false, startTime, timeLimit, ply + 1);

      if (result.timeout) return result;

      if (result.score > maxEval) {
        maxEval = result.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) {
        // Beta cutoff - update killer moves and history
        if (!move.captured) {
          // Shift killer moves
          if (killerMoves[ply]) {
            killerMoves[ply][1] = killerMoves[ply][0];
            killerMoves[ply][0] = move;
          }
          updateHistory(move, depth);
        }
        break;
      }
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

      const result = minimax(newGame, depth - 1, alpha, beta, true, startTime, timeLimit, ply + 1);

      if (result.timeout) return result;

      if (result.score < minEval) {
        minEval = result.score;
        bestMove = move;
      }

      beta = Math.min(beta, result.score);
      if (beta <= alpha) {
        // Alpha cutoff - update killer moves and history
        if (!move.captured) {
          if (killerMoves[ply]) {
            killerMoves[ply][1] = killerMoves[ply][0];
            killerMoves[ply][0] = move;
          }
          updateHistory(move, depth);
        }
        break;
      }
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

// Position history for anti-repetition
const positionHistory = new Map();

function recordPosition(fen) {
  const count = positionHistory.get(fen) || 0;
  positionHistory.set(fen, count + 1);
}

function getRepetitionCount(fen) {
  return positionHistory.get(fen) || 0;
}

function resetPositionHistory() {
  positionHistory.clear();
}

// Find best move
function findBestMove(game, difficulty = 2) {
  // Record current position
  recordPosition(game.toFEN());

  // Check opening book first for higher difficulties
  if (difficulty >= 2 && isOpeningPhase(game)) {
    const bookMove = getOpeningBookMove(game);
    if (bookMove) {
      const legalMoves = game.moves({ verbose: true });
      const matchedMove = legalMoves.find(m => m.from === bookMove.from && m.to === bookMove.to);
      if (matchedMove) {
        return matchedMove;
      }
    }
  }

  // AI opponent depths - SIGNIFICANTLY INCREASED for stronger play
  // Level 1: Very easy (makes mistakes)
  // Level 2: Easy (shallow search)
  // Level 3: Medium (decent search)
  // Level 4: Hard (deep search, strong player)
  const depths = { 1: 2, 2: 4, 3: 5, 4: 6 };
  const timeLimits = { 1: 500, 2: 2000, 3: 4000, 4: 8000 };

  const depth = depths[difficulty] || 4;
  const timeLimit = timeLimits[difficulty] || 3000;
  const startTime = Date.now();

  // Use iterative deepening for better time management
  let bestMove = null;
  let bestScore = -Infinity;
  
  const maximizing = game.turn === 'r';
  
  for (let d = 2; d <= depth; d++) {
    const result = minimax(game, d, -Infinity, Infinity, maximizing, startTime, timeLimit);
    
    if (result.timeout) break;
    
    if (result.move) {
      bestMove = result.move;
      bestScore = result.score;
    }
    
    // If we found checkmate, no need to search deeper
    if (Math.abs(result.score) > 50000) break;
  }

  // Add some randomness only at lowest difficulty
  if (difficulty <= 1 && Math.random() < 0.3) {
    const moves = game.moves({ verbose: true });
    if (moves.length > 1) {
      // Pick a random move from top half
      const sorted = [...moves].sort((a, b) => {
        const scoreA = a.captured ? PIECE_VALUES[a.captured] : 0;
        const scoreB = b.captured ? PIECE_VALUES[b.captured] : 0;
        return scoreB - scoreA;
      });
      const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
      const randomMove = topHalf[Math.floor(Math.random() * topHalf.length)];
      return randomMove;
    }
  }

  if (!bestMove) {
    bestMove = game.moves({ verbose: true })[0];
  }

  // Anti-repetition: if the best move leads to a repeated position, try alternatives
  if (bestMove) {
    const testGame = cloneGame(game);
    testGame.move(bestMove);
    const resultFen = testGame.toFEN();
    const repCount = getRepetitionCount(resultFen);

    if (repCount >= 1) {
      // Best move repeats — find the best non-repeating alternative
      const moves = game.moves({ verbose: true });
      let bestAlt = null;
      let bestAltScore = -Infinity;

      for (const m of moves) {
        const tg = cloneGame(game);
        tg.move(m);
        const mFen = tg.toFEN();
        if (getRepetitionCount(mFen) === 0) {
          // Evaluate this non-repeating move
          const mx = tg.turn === 'r';
          const mr = minimax(tg, Math.max(1, depth - 1), -Infinity, Infinity, mx, Date.now(), 500);
          const score = game.turn === 'r' ? mr.score : -mr.score;
          if (score > bestAltScore) {
            bestAltScore = score;
            bestAlt = m;
          }
        }
      }

      // Use alternative if it's not drastically worse (within 200 centipawns)
      if (bestAlt) {
        const bestScore = game.turn === 'r' ? result.score : -result.score;
        if (bestAltScore > bestScore - 200) {
          bestMove = bestAlt;
        }
      }
    }
  }

  return bestMove;
}

// Get top N moves for coach mode - uses deep search for accurate evaluation
function getTopMoves(game, n = 3, difficulty = 4, moveHistory = []) {
  const moves = game.moves({ verbose: true });
  const evaluatedMoves = [];
  const inOpening = isOpeningPhase(game);

  // Build recent move map for anti-repetition
  // Check last 10 moves by the current player for reversals
  const recentPlayerMoves = moveHistory.filter(m => m.color === game.turn).slice(-5);

  // Detect reversal: if the last player move was A→B, penalize B→A
  const lastPlayerMove = recentPlayerMoves.length > 0 ? recentPlayerMoves[recentPlayerMoves.length - 1] : null;

  // Count how many times each from→to pair has been played by this player
  const moveFrequency = {};
  for (const m of moveHistory.filter(m => m.color === game.turn)) {
    const key = `${m.from}-${m.to}`;
    moveFrequency[key] = (moveFrequency[key] || 0) + 1;
  }

  // Check opening book first
  if (inOpening) {
    const fen = game.toFEN();
    const bookMoves = OPENING_BOOK[fen];

    if (bookMoves && bookMoves.length > 0) {
      // Use book moves for opening suggestions
      const validBookMoves = bookMoves.filter(bm =>
        moves.some(m => m.from === bm.from && m.to === bm.to)
      );

      if (validBookMoves.length >= n) {
        // Return top book moves
        return validBookMoves.slice(0, n).map((bm, index) => {
          const matchedMove = moves.find(m => m.from === bm.from && m.to === bm.to);
          return {
            rank: index + 1,
            move: matchedMove,
            san: matchedMove.san,
            score: bm.score * 10,
            winProbability: 0.5 + (bm.score / 400),
            explanation: `${bm.name} / ${bm.nameEn}`,
          };
        });
      }
    }
  }

  // Use search for suggestions - focus time on most promising moves
  const depths = { 1: 3, 2: 4, 3: 5, 4: 6 };
  const searchDepth = depths[difficulty] || 4;
  const timeLimit = 8000; // 8 seconds for suggestions
  const startTime = Date.now();

  // Pre-sort moves by quick evaluation to find promising candidates
  const quickScored = moves.map(move => {
    const newGame = cloneGame(game);
    newGame.move(move);
    const raw = evaluate(newGame);
    const score = game.turn === 'r' ? raw : -raw;
    return { move, score };
  });
  quickScored.sort((a, b) => b.score - a.score);

  // Only deeply evaluate top candidates (saves time for deeper search)
  const topCandidates = quickScored.slice(0, 8);
  const timePerMove = Math.floor((timeLimit - (Date.now() - startTime)) / topCandidates.length);

  for (const candidate of topCandidates) {
    const move = candidate.move;
    // Time check
    if (Date.now() - startTime > timeLimit) break;

    const newGame = cloneGame(game);
    newGame.move(move);

    // Use minimax to evaluate this move properly
    const moveStartTime = Date.now();
    const maximizing = newGame.turn === 'r';
    const result = minimax(newGame, searchDepth - 1, -Infinity, Infinity, maximizing, moveStartTime, timePerMove);

    // result.score is always from Red's perspective (positive = good for Red)
    // Normalize so higher = better for the current player
    let score = game.turn === 'r' ? result.score : -result.score;

    // Opening-specific adjustments
    if (inOpening) {
      // Penalize early captures that aren't clearly winning
      if (move.captured) {
        const capturedValue = PIECE_VALUES[move.captured];
        const pieceValue = PIECE_VALUES[move.piece];
        // If trading down or equal, penalize in opening
        if (pieceValue >= capturedValue) {
          score -= 30;
        }
      }

      // Bonus for developing moves
      if (move.piece === 'c' && move.to[0] === 'e') {
        score += 40; // Central cannon
      } else if (move.piece === 'h' && !move.captured) {
        score += 20; // Horse development
      }
    }

    // Anti-repetition: light penalties to prefer new moves when alternatives are similar
    // These are small enough to never override a genuinely better move
    if (lastPlayerMove && move.from === lastPlayerMove.to && move.to === lastPlayerMove.from) {
      score -= 20; // Small nudge away from direct reversal
    }

    // Light penalty for moves we've already played (shuffling)
    const moveKey = `${move.from}-${move.to}`;
    const freq = moveFrequency[moveKey] || 0;
    if (freq > 0) {
      score -= freq * 10; // Tiny increasing penalty
    }

    evaluatedMoves.push({
      move,
      score: score,
      san: move.san,
    });
  }

  // Sort by score (best moves first)
  evaluatedMoves.sort((a, b) => b.score - a.score);

  // Take top N
  return evaluatedMoves.slice(0, n).map((item, index) => {
    const winProb = 1 / (1 + Math.exp(-item.score / 400));
    return {
      rank: index + 1,
      move: item.move,
      san: item.san,
      score: item.score,
      winProbability: Math.min(0.95, Math.max(0.05, winProb)), // Clamp to reasonable range
      explanation: getMoveExplanation(item.move, item.score, inOpening),
    };
  });
}

// Get explanation for a move
function getMoveExplanation(move, score, inOpening = false) {
  const pieceNameCn = PIECE_NAMES[move.piece][move.color];
  let explanation = '';

  if (move.captured) {
    const capturedName = PIECE_NAMES[move.captured][move.color === 'r' ? 'b' : 'r'];
    explanation = `${pieceNameCn}吃${capturedName} / Capture ${capturedName}`;
  } else if (inOpening) {
    // Opening-specific explanations
    if (move.piece === 'c') {
      if (move.to[0] === 'e') {
        explanation = '当头炮 / Central Cannon';
      } else if (move.to[0] === 'd' || move.to[0] === 'f') {
        explanation = '仕角炮 / Palace Corner Cannon';
      } else {
        explanation = '炮出击 / Develop Cannon';
      }
    } else if (move.piece === 'h') {
      explanation = '出马 / Develop Horse';
    } else if (move.piece === 'r') {
      explanation = '出车 / Develop Chariot';
    } else if (move.piece === 's') {
      explanation = '挺兵 / Advance Soldier';
    } else if (move.piece === 'e') {
      explanation = '飞象 / Develop Elephant';
    } else if (move.piece === 'a') {
      explanation = '上仕 / Move Advisor';
    } else {
      explanation = '开局着法 / Opening move';
    }
  } else if (score > 200) {
    explanation = '强势着法 / Strong move';
  } else if (score > 50) {
    explanation = '稳健着法 / Solid move';
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
  resetPositionHistory();
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
  resetPositionHistory,
  PIECE_VALUES,
};
