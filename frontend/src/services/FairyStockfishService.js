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
 * Convert a UCI move from Fairy-Stockfish to our move format { from, to }.
 * 
 * CRITICAL: Fairy-Stockfish uses 1-based ranks (1-10), but our system uses 0-based ranks (0-9).
 * Engine move "g1e3" means: from g-file rank-1 to e-file rank-3
 * Our notation:            from g0 to e2 (subtract 1 from each rank)
 * 
 * Examples:
 *   Engine "h1g3" → our "h0g2" (horse from h0 to g2)
 *   Engine "b1c3" → our "b0c2" (horse from b0 to c2)  
 *   Engine "g1e3" → our "g0e2" (elephant from g0 to e2)
 */
export function parseUCIMove(uciMove) {
  if (!uciMove || uciMove.length < 4) return null;
  
  // Handle ranks which can be 1-10 (engine uses 1-based ranks)
  // Move format: [file][rank][file][rank] where rank can be 1 or 2 digits
  const match = uciMove.match(/^([a-i])(\d+)([a-i])(\d+)$/);
  if (!match) return null;
  
  const fromFile = match[1];
  const fromRank = parseInt(match[2]) - 1; // Convert 1-10 to 0-9
  const toFile = match[3];
  const toRank = parseInt(match[4]) - 1; // Convert 1-10 to 0-9
  
  return {
    from: `${fromFile}${fromRank}`,
    to: `${toFile}${toRank}`,
  };
}

/**
 * Convert our move { from: 'a0', to: 'b2' } to UCI string for Fairy-Stockfish.
 * We need to add 1 to ranks since engine uses 1-based ranks (1-10).
 */
export function toUCIMove(move) {
  // Parse our ranks (0-9) and convert to engine ranks (1-10)
  const fromMatch = move.from.match(/^([a-i])(\d)$/);
  const toMatch = move.to.match(/^([a-i])(\d)$/);
  if (!fromMatch || !toMatch) return `${move.from}${move.to}`;
  
  const fromFile = fromMatch[1];
  const fromRank = parseInt(fromMatch[2]) + 1;
  const toFile = toMatch[1];
  const toRank = parseInt(toMatch[2]) + 1;
  
  return `${fromFile}${fromRank}${toFile}${toRank}`;
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
      // Download WASM binary

      const wasmResponse = await fetch('/fairy-stockfish.wasm');
      if (!wasmResponse.ok) {
        throw new Error(`Failed to fetch WASM: ${wasmResponse.status}`);
      }
      const wasmBinary = await wasmResponse.arrayBuffer();


      // Download worker script and convert to Blob URL
      // This bypasses COEP issues since blob URLs don't need cross-origin headers

      const workerResponse = await fetch('/stockfish.worker.js');
      if (!workerResponse.ok) {
        throw new Error(`Failed to fetch worker: ${workerResponse.status}`);
      }
      const workerCode = await workerResponse.text();
      const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      const workerBlobUrl = URL.createObjectURL(workerBlob);


      // Load the engine script dynamically
      const Stockfish = await this._loadEngineScript();

      // The factory returns a Promise that resolves to the engine instance

      try {
        this.engine = await Promise.race([
          Stockfish({
            wasmBinary,
            // Use blob URLs for both worker and main script to avoid COEP issues
            mainScriptUrlOrBlob: this._engineScriptBlobUrl || '/fairy-stockfish.js',
            locateFile: (path) => {
              if (path.endsWith('.worker.js')) {
                return workerBlobUrl;
              }
              if (path.endsWith('.js') && this._engineScriptBlobUrl) {
                return this._engineScriptBlobUrl;
              }
              return '/' + path;
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stockfish factory timeout (30s)')), 30000)
          )
        ]);
      } catch (factoryError) {
        console.error('[FairyStockfish] Factory failed:', factoryError);
        throw factoryError;
      }



      // Set up message listener BEFORE waiting for ready
      if (this.engine.addMessageListener) {
        this.engine.addMessageListener((line) => {
          this._onMessage(line);
        });
      } else {
        throw new Error('Engine missing addMessageListener API');
      }

      // Wait for the engine's internal ready promise (WASM + threads loaded)
      if (this.engine.ready) {

        await Promise.race([
          this.engine.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('engine.ready timeout')), 30000))
        ]);

      }

      // Small delay to ensure threads are fully initialized
      await new Promise(r => setTimeout(r, 500));

      // Initialize UCI and set xiangqi variant

      await this._sendAndWait('uci', 'uciok', 15000);
      this._send('setoption name UCI_Variant value xiangqi');
      this._send('setoption name Threads value 1');
      // Use multiple PV lines for coach analysis
      this._send('setoption name MultiPV value 3');
      await this._sendAndWait('isready', 'readyok');

      this.ready = true;
      this.initializing = false;

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
   *
   * Strategy: fetch the script as text, wrap it in a blob URL, and load it.
   * This avoids COEP/CORS issues because blob URLs are same-origin.
   * The inner worker's importScripts also needs the blob version, which is
   * handled by passing mainScriptUrlOrBlob through locateFile.
   */
  _loadEngineScript() {
    return new Promise(async (resolve, reject) => {
      // Check if already loaded
      if (window.Stockfish) {
        resolve(window.Stockfish);
        return;
      }

      try {
        // Fetch the engine JS as text and load via blob URL to bypass COEP
        const response = await fetch('/fairy-stockfish.js');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const code = await response.text();

        const blob = new Blob([code], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        // Store for the worker's importScripts (locateFile will return this)
        this._engineScriptBlobUrl = blobUrl;

        const script = document.createElement('script');
        script.src = blobUrl;
        script.onload = () => {
          if (window.Stockfish) {
            resolve(window.Stockfish);
          } else {
            reject(new Error('Stockfish global not found after blob script load'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load fairy-stockfish.js blob'));
        document.head.appendChild(script);
      } catch (err) {
        reject(new Error('Failed to fetch fairy-stockfish.js: ' + err.message));
      }
    });
  }

  /**
   * Send a UCI command to the engine.
   */
  _send(cmd) {
    if (this.engine && this.engine.postMessage) {
      this.engine.postMessage(cmd);
    } else {
      console.error('[FairyStockfish] Cannot send — no postMessage:', cmd);
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
   * @param {object} options - { depth, timeMs, numLines, skillLevel }
   *   - skillLevel: 0-20 (0=weakest, 20=strongest), default 20 for full strength
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
      skillLevel = 20, // Default to max strength (GM level)
    } = options;

    // Stop any ongoing analysis
    this.stop();

    // Reset analysis state
    this._multiPVLines = [];
    this._bestMove = null;
    this._depth = 0;
    this._score = null;

    // Set skill level (0-20, where 20 is strongest)
    // Skill level controls how "human-like" the engine plays
    const clampedSkill = Math.max(0, Math.min(20, Math.round(skillLevel)));
    this._send(`setoption name Skill Level value ${clampedSkill}`);


    // Set MultiPV
    this._send(`setoption name MultiPV value ${numLines}`);

    // Set position
    const fairyFen = toFairySF_FEN(ourFen, turn);

    this._send(`position fen ${fairyFen}`);

    // Start search
    // Use movetime as primary limit — engine searches as deep as possible within the time.
    // Depth is a max cap to prevent runaway in simple positions.
    const searchCmd = depth
      ? `go movetime ${timeMs} depth ${depth}`
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
      }, timeMs + 10000); // Extra buffer for deep analysis

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
