/**
 * Chess AI Analysis Service
 * Provides game analysis using Stockfish engine
 */

class StockfishService {
  constructor() {
    this.engine = null;
    this.isReady = false;
    this.analysisQueue = [];
    this.currentAnalysis = null;
    this.onReady = null;
  }

  /**
   * Initialize Stockfish engine
   */
  async init() {
    if (this.engine) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        // Load Stockfish as a Web Worker
        this.engine = new Worker('/stockfish.js');
        
        this.engine.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.engine.onerror = (error) => {
          console.error('Stockfish error:', error);
          reject(error);
        };

        // Initialize UCI
        this.engine.postMessage('uci');
        
        this.onReady = resolve;
      } catch (error) {
        console.error('Failed to load Stockfish:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle messages from Stockfish engine
   */
  handleMessage(message) {
    // Engine is ready
    if (message === 'uciok') {
      this.engine.postMessage('isready');
    }
    
    if (message === 'readyok') {
      this.isReady = true;
      if (this.onReady) {
        this.onReady();
        this.onReady = null;
      }
    }

    // Analysis info
    if (message.startsWith('info') && this.currentAnalysis) {
      const parsed = this.parseInfo(message);
      if (parsed) {
        this.currentAnalysis.onInfo?.(parsed);
      }
    }

    // Best move found
    if (message.startsWith('bestmove') && this.currentAnalysis) {
      const parts = message.split(' ');
      const bestMove = parts[1];
      const ponder = parts[3] || null;
      
      this.currentAnalysis.resolve({
        bestMove,
        ponder,
        ...this.currentAnalysis.lastInfo,
      });
      this.currentAnalysis = null;
      this.processQueue();
    }
  }

  /**
   * Parse info string from Stockfish
   */
  parseInfo(info) {
    const result = {};
    const parts = info.split(' ');
    
    for (let i = 0; i < parts.length; i++) {
      switch (parts[i]) {
        case 'depth':
          result.depth = parseInt(parts[++i]);
          break;
        case 'seldepth':
          result.selectiveDepth = parseInt(parts[++i]);
          break;
        case 'score':
          const scoreType = parts[++i];
          const scoreValue = parseInt(parts[++i]);
          if (scoreType === 'cp') {
            result.score = scoreValue / 100; // Convert centipawns to pawns
            result.scoreType = 'cp';
          } else if (scoreType === 'mate') {
            result.score = scoreValue;
            result.scoreType = 'mate';
          }
          break;
        case 'pv':
          result.pv = parts.slice(i + 1).join(' ');
          i = parts.length;
          break;
        case 'nodes':
          result.nodes = parseInt(parts[++i]);
          break;
        case 'nps':
          result.nodesPerSecond = parseInt(parts[++i]);
          break;
        case 'time':
          result.time = parseInt(parts[++i]);
          break;
      }
    }
    
    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Analyze a position
   * @param {string} fen - Position in FEN format
   * @param {object} options - Analysis options
   * @returns {Promise} Analysis result
   */
  async analyze(fen, options = {}) {
    if (!this.isReady) {
      await this.init();
    }

    const {
      depth = 20,
      time = null, // milliseconds
      onInfo = null,
    } = options;

    return new Promise((resolve, reject) => {
      const analysis = {
        fen,
        resolve,
        reject,
        onInfo,
        lastInfo: {},
      };

      // Update lastInfo on each info callback
      const originalOnInfo = onInfo;
      analysis.onInfo = (info) => {
        analysis.lastInfo = { ...analysis.lastInfo, ...info };
        originalOnInfo?.(info);
      };

      this.analysisQueue.push(analysis);
      
      if (!this.currentAnalysis) {
        this.processQueue();
      }
    });
  }

  /**
   * Process next analysis in queue
   */
  processQueue() {
    if (this.analysisQueue.length === 0) return;
    
    this.currentAnalysis = this.analysisQueue.shift();
    
    this.engine.postMessage('ucinewgame');
    this.engine.postMessage(`position fen ${this.currentAnalysis.fen}`);
    this.engine.postMessage('go depth 20');
  }

  /**
   * Stop current analysis
   */
  stop() {
    if (this.engine && this.currentAnalysis) {
      this.engine.postMessage('stop');
    }
  }

  /**
   * Terminate engine
   */
  terminate() {
    if (this.engine) {
      this.engine.terminate();
      this.engine = null;
      this.isReady = false;
    }
  }
}

/**
 * Game Analysis Service
 * Analyzes complete games and provides insights
 */
class GameAnalysisService {
  constructor() {
    this.stockfish = new StockfishService();
  }

  /**
   * Analyze a complete game
   * @param {array} moves - Array of move objects with FEN positions
   * @param {function} onProgress - Progress callback
   * @returns {Promise} Complete game analysis
   */
  async analyzeGame(moves, onProgress = null) {
    await this.stockfish.init();

    const analysis = [];
    const totalMoves = moves.length;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      
      // Analyze position before the move
      const beforeAnalysis = await this.stockfish.analyze(move.fenBefore, {
        depth: 18,
      });

      // Analyze position after the move
      const afterAnalysis = await this.stockfish.analyze(move.fenAfter, {
        depth: 18,
      });

      // Calculate evaluation change
      const evalBefore = beforeAnalysis.score || 0;
      const evalAfter = afterAnalysis.score || 0;
      
      // Flip perspective if it was black's move
      const isBlackMove = i % 2 === 1;
      const evalChange = isBlackMove 
        ? (evalAfter + evalBefore) 
        : (evalAfter - evalBefore);

      // Categorize move quality
      const quality = this.categorizeMoveQuality(evalChange, beforeAnalysis.bestMove, move.san);

      analysis.push({
        moveNumber: Math.floor(i / 2) + 1,
        color: isBlackMove ? 'black' : 'white',
        move: move.san,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        evalBefore: isBlackMove ? -evalBefore : evalBefore,
        evalAfter: isBlackMove ? -evalAfter : evalAfter,
        evalChange,
        bestMove: beforeAnalysis.bestMove,
        wasBestMove: beforeAnalysis.bestMove === move.uci,
        quality,
        depth: beforeAnalysis.depth,
      });

      onProgress?.(i + 1, totalMoves);
    }

    // Generate summary
    const summary = this.generateSummary(analysis);

    return {
      moves: analysis,
      summary,
    };
  }

  /**
   * Categorize move quality based on eval change
   */
  categorizeMoveQuality(evalChange, bestMove, playedMove) {
    if (evalChange >= 0.1) {
      return { type: 'excellent', label: '精彩/Excellent', emoji: '!!' };
    } else if (evalChange >= -0.1) {
      return { type: 'good', label: '好棋/Good', emoji: '' };
    } else if (evalChange >= -0.3) {
      return { type: 'inaccuracy', label: '不精确/Inaccuracy', emoji: '?!' };
    } else if (evalChange >= -1.0) {
      return { type: 'mistake', label: '失误/Mistake', emoji: '?' };
    } else {
      return { type: 'blunder', label: '大错/Blunder', emoji: '??' };
    }
  }

  /**
   * Generate game summary
   */
  generateSummary(analysis) {
    const white = { excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const black = { excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };

    for (const move of analysis) {
      const stats = move.color === 'white' ? white : black;
      stats[move.quality.type]++;
    }

    // Calculate accuracy (simplified formula)
    const calculateAccuracy = (stats, totalMoves) => {
      if (totalMoves === 0) return 100;
      const penalties = stats.inaccuracy * 5 + stats.mistake * 15 + stats.blunder * 30;
      const bonuses = stats.excellent * 5;
      return Math.max(0, Math.min(100, 100 - penalties + bonuses));
    };

    const whiteMoves = analysis.filter(m => m.color === 'white').length;
    const blackMoves = analysis.filter(m => m.color === 'black').length;

    return {
      white: {
        ...white,
        accuracy: calculateAccuracy(white, whiteMoves),
        totalMoves: whiteMoves,
      },
      black: {
        ...black,
        accuracy: calculateAccuracy(black, blackMoves),
        totalMoves: blackMoves,
      },
      totalMoves: analysis.length,
      criticalMoments: analysis.filter(m => 
        m.quality.type === 'blunder' || m.quality.type === 'mistake'
      ).map(m => m.moveNumber),
    };
  }

  /**
   * Get quick evaluation for a position
   */
  async quickEval(fen) {
    await this.stockfish.init();
    return this.stockfish.analyze(fen, { depth: 12 });
  }

  /**
   * Clean up
   */
  destroy() {
    this.stockfish.terminate();
  }
}

// Singleton instance
let analysisService = null;

export const getAnalysisService = () => {
  if (!analysisService) {
    analysisService = new GameAnalysisService();
  }
  return analysisService;
};

export { StockfishService, GameAnalysisService };
