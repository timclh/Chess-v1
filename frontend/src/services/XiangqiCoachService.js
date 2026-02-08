/**
 * Xiangqi Coach Service
 * 
 * High-level coaching service that uses Fairy-Stockfish WASM for
 * grandmaster-level analysis, with graceful fallback to the built-in AI.
 *
 * Provides the same API shape as the existing XiangqiAI functions
 * (getTopMoves, analyzePosition) but powered by a GM-strength engine.
 */

import fairyStockfishService, {
  parseUCIMove,
  toUCIMove,
} from './FairyStockfishService';
import { PIECE_NAMES } from '../xiangqi';

// Whether the engine has been successfully initialized
let engineReady = false;
let engineInitFailed = false;

/**
 * Initialize the Fairy-Stockfish engine.
 * Call this once at app start or when first entering coach mode.
 * Returns true if engine is ready.
 */
export async function initCoachEngine() {
  if (engineReady) return true;
  if (engineInitFailed) return false;

  try {
    const ok = await fairyStockfishService.init();
    engineReady = ok;
    if (!ok) engineInitFailed = true;
    return ok;
  } catch (err) {
    console.error('[XiangqiCoach] Engine init error:', err);
    engineInitFailed = false; // Allow retry
    return false;
  }
}

/**
 * Check if the engine is ready.
 */
export function isEngineReady() {
  return engineReady;
}

/**
 * Get the top N moves for a position using Fairy-Stockfish.
 *
 * Returns the same format as XiangqiAI.getTopMoves():
 *   [{ rank, move, san, score, winProbability, explanation }, ...]
 *
 * @param {Xiangqi} game - The game instance
 * @param {number} n - Number of moves to return
 * @param {Array} moveHistory - (unused for engine, kept for API compat)
 * @param {object} options - { skillLevel: 0-20 (default 20 = GM strength) }
 * @returns {Promise<Array>} Suggested moves
 */
export async function getTopMovesEngine(game, n = 3, moveHistory = [], options = {}) {
  if (!engineReady) {
    return []; // Caller should fall back to built-in AI
  }

  const {
    skillLevel = 20, // Default to max strength for coach mode
  } = options;

  const fen = game.toFEN();
  const turn = game.turn;
  const legalMoves = game.moves({ verbose: true });

  if (legalMoves.length === 0) return [];

  try {
    // Adjust depth/time based on skill level
    // WASM is single-threaded, so depth ≈ time-limited.
    // The key is keeping a big gap between AI opponent and coach.
    // Coach (skill 20): depth 30, 15s — deep GM-level analysis
    // AI opponent (skill 1-9): depth 10-12, 0.5-1.5s — intentionally shallow
    let depth, timeMs;
    if (skillLevel >= 15) {
      // Coach mode — spend serious time for deep analysis
      depth = 30;
      timeMs = 15000;
    } else {
      // AI opponent — keep shallow so coach is noticeably stronger
      depth = 8 + Math.floor(skillLevel / 2);   // skill 1→8, skill 7→11
      timeMs = 500 + skillLevel * 100;            // skill 1→600ms, skill 7→1200ms
    }
    
    const numLines = n === 1 ? 1 : Math.min(n, legalMoves.length);

    
    const result = await fairyStockfishService.analyze(fen, turn, {
      depth: depth,
      timeMs: timeMs,
      numLines: numLines,
      skillLevel: skillLevel,
    });



    if (!result || !result.lines || result.lines.length === 0) {
      console.warn('[XiangqiCoach] No engine lines returned');
      return [];
    }

    const suggestions = [];



    for (let i = 0; i < Math.min(n, result.lines.length); i++) {
      const line = result.lines[i];
      if (!line || !line.pv || line.pv.length === 0) continue;

      const uciMove = line.pv[0];
      const parsedMove = parseUCIMove(uciMove);



      if (!parsedMove) continue;

      // Match to a legal move in our engine
      const matchedMove = legalMoves.find(
        m => m.from === parsedMove.from && m.to === parsedMove.to
      );



      if (!matchedMove) continue;

      // Score from Fairy-SF is from the side-to-move's perspective (positive = good)
      // Convert to our convention (positive = good for the player)
      const rawScore = line.score || 0;
      const cpScore = rawScore; // Already from side-to-move perspective
      
      // Convert centipawn score to win probability
      const winProb = 1 / (1 + Math.exp(-cpScore / 200));

      suggestions.push({
        rank: i + 1,
        move: matchedMove,
        san: matchedMove.san,
        score: cpScore,
        winProbability: Math.min(0.99, Math.max(0.01, winProb)),
        explanation: getEngineExplanation(matchedMove, cpScore, line, game),
        engineDepth: line.depth,
        pv: line.pv, // Principal variation for advanced display
      });
    }

    return suggestions;

  } catch (err) {
    console.error('[XiangqiCoach] Analysis error:', err);
    return [];
  }
}

/**
 * Evaluate a position using Fairy-Stockfish.
 *
 * Returns the same format as XiangqiAI.analyzePosition():
 *   { score, evaluation, winProbability: { red, black } }
 *
 * @param {Xiangqi} game - The game instance
 * @returns {Promise<Object>} Position evaluation
 */
export async function analyzePositionEngine(game) {
  if (!engineReady) {
    return null; // Caller should fall back to built-in AI
  }

  const fen = game.toFEN();
  const turn = game.turn;

  try {
    const result = await fairyStockfishService.analyze(fen, turn, {
      depth: 26,
      timeMs: 8000,
      numLines: 1,
    });

    if (!result) return null;



    // result.score is from side-to-move's perspective
    // Convert to always from Red's perspective
    const scoreFromRed = turn === 'r' ? (result.score || 0) : -(result.score || 0);



    // Convert to win probability
    const winProb = 1 / (1 + Math.exp(-scoreFromRed / 200));

    let evaluation = '';
    const absScore = Math.abs(scoreFromRed);
    if (absScore < 30) {
      evaluation = '局面均势 / Equal position';
    } else if (absScore < 100) {
      evaluation = scoreFromRed > 0 ? '红方略优 / Red edge' : '黑方略优 / Black edge';
    } else if (absScore < 300) {
      evaluation = scoreFromRed > 0 ? '红方稍优 / Red slightly better' : '黑方稍优 / Black slightly better';
    } else if (absScore < 700) {
      evaluation = scoreFromRed > 0 ? '红方优势 / Red advantage' : '黑方优势 / Black advantage';
    } else if (absScore < 2000) {
      evaluation = scoreFromRed > 0 ? '红方大优 / Red winning' : '黑方大优 / Black winning';
    } else {
      evaluation = scoreFromRed > 0 ? '红方必胜 / Red decisive' : '黑方必胜 / Black decisive';
    }

    return {
      score: scoreFromRed,
      evaluation,
      winProbability: {
        red: winProb,
        black: 1 - winProb,
      },
      depth: result.depth,
      enginePowered: true,
    };

  } catch (err) {
    console.error('[XiangqiCoach] Eval error:', err);
    return null;
  }
}

/**
 * Stop any ongoing engine analysis.
 */
export function stopAnalysis() {
  if (engineReady) {
    fairyStockfishService.stop();
  }
}

/**
 * Clean up engine resources.
 */
export function destroyEngine() {
  fairyStockfishService.destroy();
  engineReady = false;
  engineInitFailed = false;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable explanation for an engine-suggested move.
 */
function getEngineExplanation(move, cpScore, line, game) {
  const pieceNameCn = PIECE_NAMES[move.piece]?.[move.color] || move.piece;
  const isOpening = countPieces(game) >= 28;

  // Check for mate
  if (line.scoreType === 'mate') {
    const mateIn = Math.abs(line.scoreRaw);
    if (line.scoreRaw > 0) {
      return `${mateIn}步杀 / Mate in ${mateIn}`;
    } else {
      return `被杀 ${mateIn} 步 / Getting mated in ${mateIn}`;
    }
  }

  // Capture moves
  if (move.captured) {
    const capturedName = PIECE_NAMES[move.captured]?.[move.color === 'r' ? 'b' : 'r'] || move.captured;
    if (cpScore > 200) {
      return `${pieceNameCn}吃${capturedName}（优） / Capture ${capturedName} (good)`;
    }
    return `${pieceNameCn}吃${capturedName} / Capture ${capturedName}`;
  }

  // Quality indicator based on search depth
  const quality = line.depth >= 20 ? '🔬' : line.depth >= 14 ? '⚡' : '';

  // Score-based explanations
  if (cpScore > 500) {
    return `${quality} 决定性着法 / Decisive move`.trim();
  } else if (cpScore > 200) {
    return `${quality} 强势着法 / Strong move`.trim();
  } else if (cpScore > 50) {
    return `${quality} 稳健着法 / Solid move`.trim();
  } else if (cpScore > -50) {
    return `${quality} 均势着法 / Equal move`.trim();
  } else {
    return `${quality} 防守着法 / Defensive move`.trim();
  }
}

/**
 * Count pieces on the board.
 */
function countPieces(game) {
  let count = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      if (game.board[row][col]) count++;
    }
  }
  return count;
}
