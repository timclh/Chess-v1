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

// ---------------------------------------------------------------------------
// Search configuration
// ---------------------------------------------------------------------------
const MATE = 100000;
const INF = 1e9;
const MAX_PLY = 64;
const QUIESCENCE_MAX_DEPTH = 8;

// Opponent strength (kept deliberately low so the player can win with the coach's help)
const AI_DEPTH = 2;
const AI_TIME_MS = 1000;
// Coach strength: iterative deepening up to this depth, bounded by time
const COACH_DEPTH = 6;
const COACH_TIME_MS = 8000;

// ---------------------------------------------------------------------------
// Transposition table (Zobrist hashing, bound flags)
// ---------------------------------------------------------------------------
const TT_EXACT = 0;
const TT_LOWER = 1;
const TT_UPPER = 2;
const PIECE_INDEX = { k: 0, a: 1, e: 2, h: 3, r: 4, c: 5, s: 6 };

// Two independent generators so the 53-bit key really carries ~53 bits
function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}
const rand1 = mulberry32(0x1234abcd);
const rand2 = mulberry32(0x7f4a7c15);
const Z1 = [];
const Z2 = [];
for (let i = 0; i < 14 * 90; i++) {
  Z1.push(rand1());
  Z2.push(rand2());
}
const TURN_Z1 = rand1();
const TURN_Z2 = rand2();

// 53-bit key: 32 bits from h1 + 21 bits from h2
function hashPosition(game) {
  let h1 = 0;
  let h2 = 0;
  const board = game.board;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      const k = (PIECE_INDEX[p.type] * 2 + (p.color === 'r' ? 0 : 1)) * 90 + r * 9 + c;
      h1 ^= Z1[k];
      h2 ^= Z2[k];
    }
  }
  if (game.turn === 'b') {
    h1 ^= TURN_Z1;
    h2 ^= TURN_Z2;
  }
  return (h1 >>> 0) + (h2 & 0x1fffff) * 4294967296;
}

// ---------------------------------------------------------------------------
// Evaluation (red's perspective)
// ---------------------------------------------------------------------------
function evaluate(game) {
  let score = 0;
  let pieceCount = 0;
  const board = game.board;

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      pieceCount++;

      const pieceValue = PIECE_VALUES[piece.type];
      const positionTable = POSITION_TABLES[piece.type];

      if (piece.color === 'r') {
        score += pieceValue + positionTable[row][col];
      } else {
        // Black pieces use the mirrored table
        score -= pieceValue + positionTable[9 - row][8 - col];
      }
    }
  }

  if (pieceCount >= 28) {
    score += evaluateOpening(game);
  }

  return score;
}

// Score from the point of view of the side to move
function evaluateForMover(game) {
  const e = evaluate(game);
  return game.turn === 'r' ? e : -e;
}

// Quick evaluation for display
function quickEvaluate(game) {
  const score = evaluate(game);
  const winProb = 1 / (1 + Math.exp(-score / 400));
  return {
    score,
    winProbability: winProb,
  };
}

// ---------------------------------------------------------------------------
// Search: negamax + alpha-beta + quiescence + TT + killers, iterative deepening
// ---------------------------------------------------------------------------
// Separate tables so deep coach results never strengthen the (shallow) opponent
const coachTable = new Map();
const opponentTable = new Map();
const MAX_CACHE_SIZE = 400000;

function orderScore(m, ttMove, killers) {
  if (ttMove && m.fr === ttMove.fr && m.fc === ttMove.fc && m.tr === ttMove.tr && m.tc === ttMove.tc) {
    return 1000000;
  }
  if (m.captured) {
    // MVV-LVA: most valuable victim, least valuable attacker
    return 100000 + PIECE_VALUES[m.captured.type] * 10 - PIECE_VALUES[m.piece];
  }
  if (killers) {
    for (const k of killers) {
      if (k && k.fr === m.fr && k.fc === m.fc && k.tr === m.tr && k.tc === m.tc) return 90000;
    }
  }
  return 0;
}

function sortMoves(moves, ttMove, killers) {
  const scored = moves.map(m => ({ m, s: orderScore(m, ttMove, killers) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.m);
}

function timeUp(ctx) {
  if ((++ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) ctx.stopped = true;
  return ctx.stopped;
}

// Only captures (or all evasions when in check) until the position is quiet
function quiesce(game, alpha, beta, ply, qdepth, ctx) {
  if (timeUp(ctx)) return 0;

  const inCheck = game.isGeneralAttacked(game.turn, game.board);
  const standPat = evaluateForMover(game);

  if (!inCheck) {
    if (standPat >= beta) return standPat;
    if (standPat > alpha) alpha = standPat;
  }
  if (qdepth >= QUIESCENCE_MAX_DEPTH || ply >= MAX_PLY) return standPat;

  let moves = game.generateMoves();
  if (moves.length === 0) return -MATE + ply; // no legal move = loss in xiangqi
  if (!inCheck) moves = moves.filter(m => m.captured);
  moves = sortMoves(moves, null, null);

  let best = inCheck ? -INF : standPat;
  for (const m of moves) {
    game.makeRaw(m);
    const score = -quiesce(game, -beta, -alpha, ply + 1, qdepth + 1, ctx);
    game.unmakeRaw(m);
    if (ctx.stopped) return 0;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

function negamax(game, depth, alpha, beta, ply, ctx) {
  if (timeUp(ctx)) return 0;
  if (depth <= 0) return quiesce(game, alpha, beta, ply, 0, ctx);
  if (ply >= MAX_PLY) return evaluateForMover(game);

  const origAlpha = alpha;
  const key = hashPosition(game);
  const entry = ctx.tt.get(key);
  let ttMove = null;
  if (entry) {
    ttMove = entry.move;
    if (entry.depth >= depth) {
      let s = entry.score;
      if (s > MATE - 1000) s -= ply;
      else if (s < -MATE + 1000) s += ply;
      if (entry.flag === TT_EXACT) return s;
      if (entry.flag === TT_LOWER && s > alpha) alpha = s;
      else if (entry.flag === TT_UPPER && s < beta) beta = s;
      if (alpha >= beta) return s;
    }
  }

  const legal = game.generateMoves();
  if (legal.length === 0) return -MATE + ply; // checkmate or stalemate: side to move loses

  const killers = ctx.killers[ply] || (ctx.killers[ply] = []);
  const moves = sortMoves(legal, ttMove, killers);

  let best = -INF;
  let bestMove = null;
  for (const m of moves) {
    game.makeRaw(m);
    const score = -negamax(game, depth - 1, -beta, -alpha, ply + 1, ctx);
    game.unmakeRaw(m);
    if (ctx.stopped) return 0;

    if (score > best) {
      best = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      if (!m.captured && !(killers[0] && killers[0].fr === m.fr && killers[0].fc === m.fc && killers[0].tr === m.tr && killers[0].tc === m.tc)) {
        killers[1] = killers[0];
        killers[0] = m;
      }
      break;
    }
  }

  let flag = TT_EXACT;
  if (best <= origAlpha) flag = TT_UPPER;
  else if (best >= beta) flag = TT_LOWER;

  let stored = best;
  if (stored > MATE - 1000) stored += ply;
  else if (stored < -MATE + 1000) stored -= ply;
  ctx.tt.set(key, {
    depth,
    score: stored,
    flag,
    move: bestMove ? { fr: bestMove.fr, fc: bestMove.fc, tr: bestMove.tr, tc: bestMove.tc } : null,
  });

  return best;
}

// Clone game state
function cloneGame(game) {
  const newGame = new Xiangqi(game.toFEN());
  newGame.turn = game.turn;
  return newGame;
}

// Iterative deepening at the root. Returns the n best moves of the last
// fully completed iteration, with exact scores from the mover's perspective.
function searchRoot(game, maxDepth, timeMs, n = 1, tt = coachTable) {
  if (tt.size > MAX_CACHE_SIZE) tt.clear();

  const g = cloneGame(game); // never mutate the caller's live game
  const rootMoves = g.generateMoves();
  if (rootMoves.length === 0) return null;

  const ctx = { deadline: Infinity, nodes: 0, stopped: false, killers: [], tt };
  let ordered = sortMoves(rootMoves, null, null);
  let completed = null;
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Depth 1 always completes; later depths are bounded by the time budget
    if (depth === 2) ctx.deadline = Date.now() + timeMs;

    const iter = [];
    for (const m of ordered) {
      const alpha = iter.length >= n ? iter[n - 1].score : -INF;
      g.makeRaw(m);
      const score = -negamax(g, depth - 1, -INF, -alpha, 1, ctx);
      g.unmakeRaw(m);
      if (ctx.stopped) break;
      iter.push({ m, score });
      iter.sort((a, b) => b.score - a.score);
    }
    if (ctx.stopped) break;

    completed = iter;
    completedDepth = depth;
    ordered = iter.map(x => x.m);
    if (iter[0].score > MATE - 1000) break; // forced mate found
  }

  return { moves: completed.slice(0, n), depth: completedDepth, nodes: ctx.nodes };
}

// Convert an internal coordinate move into the public move object
function toMoveObj(game, m) {
  const piece = game.board[m.fr][m.fc];
  return {
    from: game.positionToString(m.fr, m.fc),
    to: game.positionToString(m.tr, m.tc),
    piece: piece.type,
    color: piece.color,
    captured: m.captured ? m.captured.type : null,
    san: game.toSAN(m.fr, m.fc, m.tr, m.tc, piece, m.captured),
  };
}

// Find best move for the AI opponent
function findBestMove(game, difficulty = 2) {
  const result = searchRoot(game, AI_DEPTH, AI_TIME_MS, 3, opponentTable);
  if (!result) return null;

  // Lowest level plays an occasional random move
  if (difficulty <= 1 && Math.random() < 0.2) {
    const all = game.moves({ verbose: true });
    if (all.length > 1) return all[Math.floor(Math.random() * all.length)];
  }

  // Vary play: pick randomly among moves that are practically as good as the best
  const best = result.moves[0].score;
  const near = result.moves.filter(x => x.score >= best - 15);
  const pick = near[Math.floor(Math.random() * near.length)];
  return toMoveObj(game, pick.m);
}

// Get top N moves for coach mode
function getTopMoves(game, n = 3, difficulty = 4) { // eslint-disable-line no-unused-vars
  const moves = game.moves({ verbose: true });
  const inOpening = isOpeningPhase(game);

  // Check opening book first
  if (inOpening) {
    const fen = game.toFEN();
    const bookMoves = OPENING_BOOK[fen];

    if (bookMoves && bookMoves.length > 0) {
      const validBookMoves = bookMoves.filter(bm =>
        moves.some(m => m.from === bm.from && m.to === bm.to)
      );

      if (validBookMoves.length >= n) {
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

  const result = searchRoot(game, COACH_DEPTH, COACH_TIME_MS, n);
  if (!result) return [];

  return result.moves.map((item, index) => {
    const move = toMoveObj(game, item.m);
    const winProb = 1 / (1 + Math.exp(-item.score / 400));
    return {
      rank: index + 1,
      move,
      san: move.san,
      score: item.score,
      depth: result.depth,
      winProbability: Math.min(0.95, Math.max(0.05, winProb)),
      explanation: getMoveExplanation(move, item.score, inOpening),
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
  coachTable.clear();
  opponentTable.clear();
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
  searchRoot,
  PIECE_VALUES,
};
