/**
 * Chess Coach Service
 *
 * Recommended moves for chess from the same Fairy-Stockfish engine the xiangqi coach
 * uses (it plays standard chess as a variant). The built-in JavaScript search it
 * replaces looked three moves ahead on the UI thread and took 5 to 50 seconds per
 * position; the engine reaches depth 10 in about a quarter of a second, in a worker.
 *
 * The 11 MB xiangqi network is not needed for chess and is not downloaded here.
 */

import fairyStockfishService from './FairyStockfishService';
import { canRunEngine } from './EngineSupport';
import { generateMoveExplanation, scoreToWinProbability } from '../ChessAI';

// Chess is searched with the classical evaluation, which reaches depth 10 in about 0.3 s
// and 11-12 in a second. Stops as soon as the best move has settled.
export const CHESS_SEARCH = {
  maxMs: 1500,
  earlyStop: { minMs: 400, minDepth: 10, stableDepths: 3 },
};

const CACHE_MAX_SIZE = 100;
const CACHE_MIN_DEPTH = 10;

let engineReady = false;
let engineInitFailed = false;
let prewarming = false;

const cache = new Map(); // `${fen}|${n}` → suggestions
const inflight = new Map();

export function clearChessAnalysisCache() {
  cache.clear();
}

/** Start the engine. Resolves to whether it is ready; never rejects. */
export async function initChessEngine() {
  if (engineReady) return true;
  if (engineInitFailed) return false;
  try {
    const ok = await fairyStockfishService.init({ network: false });
    engineReady = ok;
    if (!ok) engineInitFailed = true;
    return ok;
  } catch (err) {
    console.error('[ChessCoach] Engine init error:', err);
    return false;
  }
}

export function isChessEngineReady() {
  return engineReady;
}

/**
 * Start the engine in the background so the first hint does not wait for it. Does
 * nothing where the engine cannot run (see canRunEngine). Resolves to whether it is ready.
 */
export function prewarmChessEngine() {
  if (engineReady) return Promise.resolve(true);
  if (prewarming || engineInitFailed || !canRunEngine()) return Promise.resolve(false);
  prewarming = true;
  return initChessEngine().catch(() => false).then((ok) => { prewarming = false; return ok; });
}

/**
 * The best `n` moves (1-2 is plenty) for the side to move, best first, in the shape
 * ChessAI.getTopMoves returns: { rank, move, san, score (White's view, centipawns),
 * winProbability (for the side to move), explanation, engineDepth, pv }.
 *
 * Resolves to [] if the engine is not available (use the built-in search), and to
 * null if the answer is stale: a newer request replaced this one, or the board moved on.
 */
export async function getTopMovesEngineChess(game, n = 2) {
  if (!engineReady) return [];
  const fen = game.fen();
  const key = `${fen}|${n}`;

  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit); // most recently used
    return hit;
  }
  const running = inflight.get(key);
  if (running) return running;

  const search = compute(game, fen, n);
  inflight.set(key, search);
  const done = () => { if (inflight.get(key) === search) inflight.delete(key); };
  search.then(done, done);
  return search;
}

async function compute(game, fen, n) {
  const legal = game.moves({ verbose: true });
  if (legal.length === 0) return [];
  const white = game.turn() === 'w';

  if (legal.length === 1) {
    const only = legal[0];
    return [{
      rank: 1, move: only, san: only.san, score: 0, winProbability: 0.5,
      explanation: 'Only legal move', engineDepth: 0, pv: [],
    }];
  }

  let result;
  const started = Date.now();
  try {
    result = await fairyStockfishService.analyze(fen, game.turn(), {
      variant: 'chess',
      depth: 30,
      timeMs: CHESS_SEARCH.maxMs,
      numLines: Math.max(1, Math.min(n, legal.length)),
      earlyStop: CHESS_SEARCH.earlyStop,
    });
  } catch (err) {
    console.error('[ChessCoach] Analysis error:', err);
    return [];
  }

  if (!result || result.superseded) return null;
  if (game.fen() !== fen) return null; // the board moved on while the engine was thinking
  if (!result.lines || result.lines.length === 0) return [];

  const suggestions = [];
  for (const line of result.lines) {
    if (!line || !line.pv || line.pv.length === 0) continue;
    const uci = line.pv[0];
    const move = legal.find((m) => m.from === uci.slice(0, 2) && m.to === uci.slice(2, 4)
      && (m.promotion || '') === (uci[4] || ''));
    if (!move) continue;

    // The engine scores from the side to move's point of view; the rest of the chess
    // code (ChessAI) uses White's.
    const mover = line.score || 0;
    const score = white ? mover : -mover;
    suggestions.push({
      move,
      san: move.san,
      score,
      winProbability: Math.min(0.99, Math.max(0.01, scoreToWinProbability(score, white))),
      engineDepth: line.depth,
      engineMs: Date.now() - started,
      pv: line.pv,
    });
  }

  // Best first for the side to move (lines of one search are already in order; this
  // only guards against a line that fell back to an earlier depth)
  suggestions.sort((a, b) => (white ? b.score - a.score : a.score - b.score));
  suggestions.forEach((s, i) => {
    s.rank = i + 1;
    s.explanation = generateMoveExplanation(game, s.move, s.score, i === 0);
  });

  if (suggestions.length > 0 && Math.max(...suggestions.map((s) => s.engineDepth || 0)) >= CACHE_MIN_DEPTH) {
    const key = `${fen}|${n}`;
    if (cache.size >= CACHE_MAX_SIZE) cache.delete(cache.keys().next().value);
    cache.set(key, suggestions);
  }
  return suggestions;
}
