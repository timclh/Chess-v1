/**
 * WuziQi AI — Minimax with alpha-beta pruning + heuristic evaluation
 *
 * Provides 4 difficulty levels:
 *   1 (Easy)   — depth 1, random noise
 *   2 (Medium) — depth 2
 *   3 (Hard)   — depth 3
 *   4 (Expert) — depth 4
 */

import { BOARD_SIZE, EMPTY, BLACK, WHITE, DIRECTIONS } from './wuziqi';

// ── Pattern Scoring ────────────────────────────────────────
// Score lines of N in a row (with open/closed ends)
const SCORES = {
  FIVE: 1000000,
  OPEN_FOUR: 100000,
  CLOSED_FOUR: 10000,
  OPEN_THREE: 5000,
  CLOSED_THREE: 500,
  OPEN_TWO: 200,
  CLOSED_TWO: 20,
  ONE: 5,
};

/**
 * Evaluate a single line segment for one color.
 * Returns a score based on pattern matching.
 */
function evaluateLine(board, row, col, dr, dc, color) {
  const opp = color === BLACK ? WHITE : BLACK;

  // Count consecutive stones in both directions from (row, col)
  let count = 1;
  let openEnds = 0;

  // Positive direction
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === color) {
    count++;
    r += dr;
    c += dc;
  }
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === EMPTY) {
    openEnds++;
  }

  // Negative direction
  r = row - dr;
  c = col - dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === color) {
    count++;
    r -= dr;
    c -= dc;
  }
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === EMPTY) {
    openEnds++;
  }

  if (count >= 5) return SCORES.FIVE;
  if (openEnds === 0) return 0; // completely blocked

  if (count === 4) return openEnds === 2 ? SCORES.OPEN_FOUR : SCORES.CLOSED_FOUR;
  if (count === 3) return openEnds === 2 ? SCORES.OPEN_THREE : SCORES.CLOSED_THREE;
  if (count === 2) return openEnds === 2 ? SCORES.OPEN_TWO : SCORES.CLOSED_TWO;
  if (count === 1) return SCORES.ONE;
  return 0;
}

/**
 * Evaluate the entire board from the perspective of `color`.
 */
function evaluateBoard(board, color) {
  const opp = color === BLACK ? WHITE : BLACK;
  let myScore = 0;
  let oppScore = 0;
  const evaluated = new Set();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY) continue;
      const stone = board[r][c];

      for (const [dr, dc] of DIRECTIONS) {
        // Avoid double-counting: only evaluate from the "start" of a line
        const pr = r - dr;
        const pc = c - dc;
        if (pr >= 0 && pr < BOARD_SIZE && pc >= 0 && pc < BOARD_SIZE && board[pr][pc] === stone) {
          continue; // not the start of this line
        }

        const score = evaluateLine(board, r, c, dr, dc, stone);
        if (stone === color) myScore += score;
        else oppScore += score;
      }
    }
  }

  return myScore - oppScore * 1.1; // slightly weight defense
}

/**
 * Minimax with alpha-beta pruning.
 */
function minimax(board, depth, alpha, beta, isMaximizing, aiColor) {
  const oppColor = aiColor === BLACK ? WHITE : BLACK;
  const currentColor = isMaximizing ? aiColor : oppColor;

  // Get candidate moves
  const candidates = getCandidates(board);
  if (candidates.length === 0 || depth === 0) {
    return { score: evaluateBoard(board, aiColor), move: null };
  }

  // Score and sort candidates for better pruning
  const scored = candidates.map(({ row, col }) => {
    board[row][col] = currentColor;
    const s = evaluateBoard(board, aiColor);
    board[row][col] = EMPTY;
    return { row, col, heuristic: s };
  });
  scored.sort((a, b) => isMaximizing ? b.heuristic - a.heuristic : a.heuristic - b.heuristic);

  // Limit candidates for performance
  const topN = Math.min(scored.length, depth >= 3 ? 10 : 15);
  const topCandidates = scored.slice(0, topN);

  let bestMove = topCandidates[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const { row, col } of topCandidates) {
      board[row][col] = aiColor;

      // Check immediate win
      if (checkWinFast(board, row, col, aiColor)) {
        board[row][col] = EMPTY;
        return { score: SCORES.FIVE, move: { row, col } };
      }

      const result = minimax(board, depth - 1, alpha, beta, false, aiColor);
      board[row][col] = EMPTY;

      if (result.score > maxEval) {
        maxEval = result.score;
        bestMove = { row, col };
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const { row, col } of topCandidates) {
      board[row][col] = oppColor;

      // Check opponent immediate win
      if (checkWinFast(board, row, col, oppColor)) {
        board[row][col] = EMPTY;
        return { score: -SCORES.FIVE, move: { row, col } };
      }

      const result = minimax(board, depth - 1, alpha, beta, true, aiColor);
      board[row][col] = EMPTY;

      if (result.score < minEval) {
        minEval = result.score;
        bestMove = { row, col };
      }
      beta = Math.min(beta, result.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

/**
 * Quick win check at a position.
 */
function checkWinFast(board, row, col, color) {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === color) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      const nr = row - dr * i;
      const nc = col - dc * i;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === color) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

/**
 * Get candidate moves (empty cells near existing stones).
 */
function getCandidates(board) {
  const candidates = [];
  const radius = 2;
  let hasStone = false;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) { hasStone = true; continue; }

      let near = false;
      for (let dr = -radius; dr <= radius && !near; dr++) {
        for (let dc = -radius; dc <= radius && !near; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== EMPTY) {
            near = true;
          }
        }
      }
      if (near) candidates.push({ row: r, col: c });
    }
  }

  if (!hasStone) return [{ row: 7, col: 7 }]; // center
  return candidates;
}

// ── Difficulty-based depth ─────────────────────────────────
const DEPTH_BY_DIFFICULTY = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

/**
 * Find the best move for the AI.
 * @param {WuziQi} game - game engine instance
 * @param {number} difficulty - 1-4
 * @returns {{ row: number, col: number }}
 */
export function findBestMoveWuziQi(game, difficulty = 2) {
  const depth = DEPTH_BY_DIFFICULTY[difficulty] || 2;
  const aiColor = game.turn;

  // First move: play center with slight random offset for variety
  if (game.moveHistory.length === 0) {
    return { row: 7, col: 7 };
  }

  // Second move (response): play near center
  if (game.moveHistory.length === 1) {
    const last = game.moveHistory[0];
    const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const off = offsets[Math.floor(Math.random() * offsets.length)];
    const r = Math.max(0, Math.min(14, last.row + off[0]));
    const c = Math.max(0, Math.min(14, last.col + off[1]));
    if (game.board[r][c] === EMPTY) return { row: r, col: c };
    return { row: 7, col: 7 };
  }

  // Check for immediate wins/blocks first
  const candidates = getCandidates(game.board);
  
  // Immediate win
  for (const { row, col } of candidates) {
    game.board[row][col] = aiColor;
    if (checkWinFast(game.board, row, col, aiColor)) {
      game.board[row][col] = EMPTY;
      return { row, col };
    }
    game.board[row][col] = EMPTY;
  }

  // Block opponent's immediate win
  const oppColor = aiColor === BLACK ? WHITE : BLACK;
  for (const { row, col } of candidates) {
    game.board[row][col] = oppColor;
    if (checkWinFast(game.board, row, col, oppColor)) {
      game.board[row][col] = EMPTY;
      return { row, col };
    }
    game.board[row][col] = EMPTY;
  }

  // Clone board for minimax (so we don't mutate game state)
  const boardCopy = game.board.map(row => [...row]);
  const result = minimax(boardCopy, depth, -Infinity, Infinity, true, aiColor);

  if (result.move) {
    // Add noise for easy difficulty
    if (difficulty === 1 && Math.random() < 0.3) {
      const randomIdx = Math.floor(Math.random() * Math.min(candidates.length, 5));
      return candidates[randomIdx] || result.move;
    }
    return result.move;
  }

  // Fallback: pick any candidate
  return candidates[0] || { row: 7, col: 7 };
}

/**
 * Evaluate a position and return a textual analysis.
 */
export function analyzeWuziQiPosition(game) {
  const blackScore = evaluateBoard(game.board, BLACK);
  const whiteScore = evaluateBoard(game.board, WHITE);

  let advantage;
  if (Math.abs(blackScore - whiteScore) < 500) {
    advantage = { cn: '局势均衡', en: 'Position is balanced' };
  } else if (blackScore > whiteScore) {
    advantage = { cn: '黑方优势', en: 'Black has the advantage' };
  } else {
    advantage = { cn: '白方优势', en: 'White has the advantage' };
  }

  return {
    blackScore,
    whiteScore,
    advantage,
    moveCount: game.moveHistory.length,
    turn: game.turn === BLACK ? 'black' : 'white',
  };
}
