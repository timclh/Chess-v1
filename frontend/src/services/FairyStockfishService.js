/**
 * Fairy-Stockfish WASM Service
 * 
 * Wraps the Fairy-Stockfish WASM engine for Xiangqi analysis.
 * Uses a Web Worker to avoid blocking the UI thread.
 * Handles FEN translation between our notation (h/e/s) and
 * standard Xiangqi notation used by Fairy-Stockfish (n/b/p).
 *
 * Our engine:   r h e a k c s  (chariot, horse, elephant, advisor, king, cannon, soldier)
 * Fairy-SF:     r n b a k c p  (rook,    knight, bishop,   advisor, king, cannon, pawn)
 */

// ─── FEN Translation ────────────────────────────────────────────────────────

// Our piece letters → Fairy-Stockfish standard
const TO_FAIRY = { h: 'n', e: 'b', s: 'p', H: 'N', E: 'B', S: 'P' };
// Fairy-Stockfish → our piece letters
const FROM_FAIRY = { n: 'h', b: 'e', p: 's', N: 'H', B: 'E', P: 'S' };

/**
 * Convert our FEN (rheakaehr…) to Fairy-Stockfish FEN (rnbakabnr…)
 * Also appends the turn and move counters expected by UCI.
 */
export function toFairySF_FEN(ourFen, turn = 'r') {
  // Our FEN is just the board part; Fairy-SF wants full FEN:
  //   <board> <turn> - - 0 1
  const board = ourFen.replace(/[hHeEsS]/g, ch => TO_FAIRY[ch] || ch);
  const fairyTurn = turn === 'r' ? 'w' : 'b';
  return `${board} ${fairyTurn} - - 0 1`;
}

/**
 * Convert a Fairy-Stockfish FEN board string back to our notation.
 */
export function fromFairySF_FEN(fairyFen) {
  // fairyFen may be full FEN "board turn castle ep halfmove fullmove"
  const board = fairyFen.split(' ')[0];
  return board.replace(/[nNbBpP]/g, ch => FROM_FAIRY[ch] || ch);
}

/**
 * Convert a UCI move (e.g. "b0c2") to our move format { from, to }.
 * Fairy-Stockfish xiangqi uses coordinate notation:
 *   file a-i (cols 0-8), rank 0-9 (row 9 is rank 0 for red).
 * Our board has row 0 at top (black side = rank 9),
 *   row 9 at bottom (red side = rank 0).
 *
 * So Fairy-SF move "a0b2" means file=a rank=0 → file=b rank=2
 *   which in our coords: col=0, row=9-0=9 → col=1, row=9-2=7
 *   i.e. { from: 'a0', to: 'b2' }   (our notation is the same as UCI here)
 */
export function parseUCIMove(uciMove) {
  if (!uciMove || uciMove.length < 4) return null;
  const fromFile = uciMove[0];
  const fromRank = uciMove[1];
  const toFile = uciMove[2];
  const toRank = uciMove[3];
  return {
    from: `${fromFile}${fromRank}`,
    to: `${toFile}${toRank}`,
  };
}

/**
 * Convert our move { from: 'a0', to: 'b2' } to UCI string "a0b2".
 */
export function toUCIMove(move) {
  return `${move.from}${move.to}`;
}

// ─── Engine Service ─────────────────────────────────────────────────────────

class FairyStockfishService {
  constructor() {
    this.engine = null;
    this.ready = false;
    this.initializing = false;
    this._initPromise = null;
    this._pendingCallbacks = [];
    this._currentAnalysis = null;
    this._multiPVLines = [];
    this._bestMove = null;
    this._depth = 0;
    this._score = null;
  }

  /**
   * Initialize the engine. Returns a promise that resolves when ready.
   * Safe to call multiple times — only initializes once.
   */
  async init() {
    if (this.ready) return true;
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    if (this.initializing) return false;
    this.initializing = true;

    try {
      // Load the engine script dynamically
      const engineModule = await this._loadEngineScript();

      // Create engine instance — DON'T pre-fetch WASM, let the engine
      // handle it via locateFile so it loads WASM internally with threading.
      console.log('[FairyStockfish] Creating engine instance...');
      const instance = engineModule({
        locateFile: (path) => {
          if (path.endsWith('.wasm')) return '/fairy-stockfish.wasm';
          if (path.endsWith('.worker.js')) return '/fairy-stockfish.worker.js';
          return '/' + path;
        },
      });

      // The factory returns an object with a .ready promise that resolves
      // when WASM + pthreads are fully initialized.
      this.engine = instance;

      // Set up message listener BEFORE waiting for ready
      if (this.engine.addMessageListener) {
        this.engine.addMessageListener((line) => this._onMessage(line));
        console.log('[FairyStockfish] Message listener attached');
      } else {
        throw new Error('Engine missing addMessageListener API');
      }

      // Wait for the engine's internal ready promise (WASM + threads loaded)
      if (this.engine.ready) {
        console.log('[FairyStockfish] Waiting for engine.ready...');
        await Promise.race([
          this.engine.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('engine.ready timeout')), 30000))
        ]);
        console.log('[FairyStockfish] engine.ready resolved');
      }

      // Initialize UCI and set xiangqi variant
      await this._sendAndWait('uci', 'uciok');
      this._send('setoption name UCI_Variant value xiangqi');
      this._send('setoption name Threads value 1');
      // Use multiple PV lines for coach analysis
      this._send('setoption name MultiPV value 3');
      await this._sendAndWait('isready', 'readyok');

      this.ready = true;
      this.initializing = false;
      console.log('[FairyStockfish] Engine initialized successfully');
      return true;

    } catch (err) {
      console.error('[FairyStockfish] Init failed:', err);
      this.initializing = false;
      this._initPromise = null;
      return false;
    }
  }

  /**
   * Load the Fairy-Stockfish JS engine script.
   */
  _loadEngineScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.Stockfish) {
        resolve(window.Stockfish);
        return;
      }

      const script = document.createElement('script');
      script.src = '/fairy-stockfish.js';
      script.onload = () => {
        if (window.Stockfish) {
          resolve(window.Stockfish);
        } else {
          reject(new Error('Stockfish global not found after script load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load fairy-stockfish.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Send a UCI command to the engine.
   */
  _send(cmd) {
    if (this.engine && this.engine.postMessage) {
      this.engine.postMessage(cmd);
    }
  }

  /**
   * Send a command and wait for a specific response line.
   */
  _sendAndWait(cmd, waitFor, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pendingCallbacks = this._pendingCallbacks.filter(cb => cb !== callback);
        reject(new Error(`Timeout waiting for "${waitFor}"`));
      }, timeoutMs);

      const callback = (line) => {
        if (line.startsWith(waitFor)) {
          clearTimeout(timeout);
          this._pendingCallbacks = this._pendingCallbacks.filter(cb => cb !== callback);
          resolve(line);
        }
      };

      this._pendingCallbacks.push(callback);
      this._send(cmd);
    });
  }

  /**
   * Handle messages from the engine.
   */
  _onMessage(line) {
    // Forward to pending callbacks
    for (const cb of this._pendingCallbacks) {
      cb(line);
    }

    // Parse "info" lines for analysis data
    if (line.startsWith('info')) {
      this._parseInfoLine(line);
    }

    // Parse "bestmove" line
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      this._bestMove = parts[1] || null;

      // Resolve the current analysis promise
      if (this._currentAnalysis) {
        this._currentAnalysis.resolve({
          bestMove: this._bestMove,
          lines: [...this._multiPVLines],
          depth: this._depth,
          score: this._score,
        });
        this._currentAnalysis = null;
      }
    }
  }

  /**
   * Parse a UCI "info" line to extract depth, score, PV, multipv.
   */
  _parseInfoLine(line) {
    const tokens = line.split(' ');

    let depth = null;
    let score = null;
    let scoreType = 'cp'; // cp or mate
    let pvMoves = [];
    let multipv = 1;

    for (let i = 0; i < tokens.length; i++) {
      switch (tokens[i]) {
        case 'depth':
          depth = parseInt(tokens[i + 1]);
          break;
        case 'multipv':
          multipv = parseInt(tokens[i + 1]);
          break;
        case 'score':
          scoreType = tokens[i + 1]; // 'cp' or 'mate'
          score = parseInt(tokens[i + 2]);
          break;
        case 'pv':
          pvMoves = tokens.slice(i + 1);
          break;
        default:
          break;
      }
    }

    if (depth !== null && pvMoves.length > 0) {
      this._depth = Math.max(this._depth || 0, depth);

      const lineData = {
        depth,
        score: scoreType === 'mate' ? (score > 0 ? 100000 - score : -100000 - score) : score,
        scoreType,
        scoreRaw: score,
        pv: pvMoves,
        multipv,
      };

      // Store in multipv slot (1-indexed)
      this._multiPVLines[multipv - 1] = lineData;

      if (multipv === 1) {
        this._score = lineData.score;
      }
    }
  }

  /**
   * Analyze a position and get the top N moves.
   *
   * @param {string} ourFen - FEN in our notation (rheakaehr…)
   * @param {string} turn - 'r' or 'b'
   * @param {object} options - { depth, timeMs, numLines }
   * @returns {Promise<{bestMove, lines, depth, score}>}
   */
  async analyze(ourFen, turn = 'r', options = {}) {
    if (!this.ready) {
      const ok = await this.init();
      if (!ok) throw new Error('Engine failed to initialize');
    }

    const {
      depth = 18,
      timeMs = 3000,
      numLines = 3,
    } = options;

    // Stop any ongoing analysis
    this.stop();

    // Reset analysis state
    this._multiPVLines = [];
    this._bestMove = null;
    this._depth = 0;
    this._score = null;

    // Set MultiPV
    this._send(`setoption name MultiPV value ${numLines}`);

    // Set position
    const fairyFen = toFairySF_FEN(ourFen, turn);
    this._send(`position fen ${fairyFen}`);

    // Start search
    const searchCmd = depth
      ? `go depth ${depth} movetime ${timeMs}`
      : `go movetime ${timeMs}`;

    // Create promise for the result
    const resultPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stop();
        // Return whatever we have so far
        resolve({
          bestMove: this._bestMove,
          lines: [...this._multiPVLines],
          depth: this._depth,
          score: this._score,
        });
      }, timeMs + 5000); // Extra buffer

      this._currentAnalysis = {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject,
      };
    });

    this._send(searchCmd);
    return resultPromise;
  }

  /**
   * Stop the current analysis.
   */
  stop() {
    if (this.engine && this.engine.postMessage) {
      this._send('stop');
    }
  }

  /**
   * Clean up the engine.
   */
  destroy() {
    this.stop();
    if (this.engine && this.engine.terminate) {
      this.engine.terminate();
    }
    this.engine = null;
    this.ready = false;
    this._initPromise = null;
  }

  /**
   * Check if engine is ready.
   */
  isReady() {
    return this.ready;
  }
}

// Singleton instance
const fairyStockfishService = new FairyStockfishService();
export default fairyStockfishService;
