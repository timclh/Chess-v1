import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";
import {
  findBestMove, getTopMoves, analyzePosition, explainAIMove, getStrategicAdvice, clearCache,
  quickEvaluate, analyzeGame, generateLearningTips, COMMON_PATTERNS_LIBRARY,
  getBestMoveForRetrospect, scoreToWinProbability
} from "./ChessAI";
import { saveGameResult, saveGameState, loadGameState, hasSavedGame, deleteSavedGame } from "./GameHistory";
import { getRating, recordResult } from "./services/UserRatingService";
import { getOpeningBookMoves, detectOpening } from "./services/PatternService";
import { GAME_TYPE, RESULT } from "./constants";
import { fitSquare, autoResize, chessBoardOptions, boardTiltDegrees } from "./services/ViewportService";
import { initSound } from "./services/SoundService";
import { chessMoveFeedback, selectFeedback } from "./services/FeedbackService";
import { RatingDisplay } from "./components/RatingDisplay";
import { GameResultDialog } from "./components/GameResultDialog";
import { Icon } from './components/Icon';
import CoachSheet from './components/CoachSheet';
import TiltStage from './components/TiltStage';
import { prewarmChessEngine, isChessEngineReady, getTopMovesEngineChess } from './services/ChessCoachService';

// How long a recommendation waits for the engine to finish starting before the
// built-in search answers instead (the engine then refreshes it)
const ENGINE_WAIT_MS = 4000;

// 3D (tilted) or flat board; 3D unless the player switched it off
const TILT_KEY = 'chess_tilt';
const readTiltPref = () => {
  try { return localStorage.getItem(TILT_KEY) !== 'off'; } catch (_) { return true; }
};

// The board's edge and the shadow it casts on the table, when tilted
const TILTED_BOARD_STYLE = {
  borderRadius: '4px',
  boxShadow: '0 0 0 6px var(--walnut-700), 0 14px 0 2px var(--walnut-900), 0 30px 34px rgba(0, 0, 0, 0.55)',
};

// Tutorial lessons for beginners
const TUTORIAL_LESSONS = [
  {
    id: 1,
    title: "棋子移动: 兵 (Pawn)",
    titleEn: "Piece Movement: Pawn",
    description: "兵只能向前移动一格，但捕获时需要斜向移动。第一次移动可以走两格。",
    descriptionEn: "Pawns move forward one square, but capture diagonally. On first move, they can advance two squares.",
    fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
    objective: "将兵移动到e4",
    objectiveEn: "Move the pawn to e4",
    correctMove: "e4",
    hint: "兵在第一次移动时可以走两格",
    hintEn: "Pawns can move two squares on their first move",
  },
  {
    id: 2,
    title: "棋子移动: 车 (Rook)",
    titleEn: "Piece Movement: Rook",
    description: "车可以水平或垂直移动任意格数。",
    descriptionEn: "Rooks move horizontally or vertically any number of squares.",
    fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
    objective: "将车移动到a8",
    objectiveEn: "Move the rook to a8",
    correctMove: "Ra8+",
    alternativeMoves: ["Ra8"],
    hint: "车可以沿直线移动整个棋盘",
    hintEn: "Rooks can move in straight lines across the entire board",
  },
  {
    id: 3,
    title: "棋子移动: 象 (Bishop)",
    titleEn: "Piece Movement: Bishop",
    description: "象只能斜向移动任意格数。",
    descriptionEn: "Bishops move diagonally any number of squares.",
    fen: "4k3/8/8/8/8/8/8/2B1K3 w - - 0 1",
    objective: "将象移动到h6",
    objectiveEn: "Move the bishop to h6",
    correctMove: "Bh6",
    hint: "象只能走斜线",
    hintEn: "Bishops can only move diagonally",
  },
  {
    id: 4,
    title: "棋子移动: 马 (Knight)",
    titleEn: "Piece Movement: Knight",
    description: "马走L形：两格直线加一格垂直（或相反）。马是唯一可以跳过其他棋子的棋子。",
    descriptionEn: "Knights move in an L-shape: two squares in one direction and one perpendicular. Knights can jump over pieces.",
    fen: "4k3/8/8/8/8/8/8/1N2K3 w - - 0 1",
    objective: "将马移动到c3",
    objectiveEn: "Move the knight to c3",
    correctMove: "Nc3",
    hint: "马走日字形",
    hintEn: "Knights move in an L-shape pattern",
  },
  {
    id: 5,
    title: "棋子移动: 后 (Queen)",
    titleEn: "Piece Movement: Queen",
    description: "后是最强大的棋子，可以水平、垂直和斜向移动任意格数。",
    descriptionEn: "The Queen is the most powerful piece. It moves horizontally, vertically, or diagonally any number of squares.",
    fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1",
    objective: "将后移动到h8",
    objectiveEn: "Move the queen to h8",
    correctMove: "Qh8+",
    alternativeMoves: ["Qh8"],
    hint: "后可以像车和象一样移动",
    hintEn: "The Queen combines the moves of a rook and bishop",
  },
  {
    id: 6,
    title: "棋子移动: 王 (King)",
    titleEn: "Piece Movement: King",
    description: "王每次只能移动一格，但可以向任何方向移动。保护好你的王！",
    descriptionEn: "The King moves one square in any direction. Protect your King at all costs!",
    fen: "4k3/8/8/8/4K3/8/8/8 w - - 0 1",
    objective: "将王移动到e5",
    objectiveEn: "Move the king to e5",
    correctMove: "Ke5",
    hint: "王每次只能走一格",
    hintEn: "The King can only move one square at a time",
  },
  {
    id: 7,
    title: "将军 (Check)",
    titleEn: "Check",
    description: "当王被攻击时，这叫做「将军」。你必须立即解除将军。",
    descriptionEn: "When the King is under attack, it's called 'check'. You must get out of check immediately.",
    fen: "8/8/8/8/8/5q2/4K3/8 w - - 0 1",
    objective: "王被将军了！将王移动到安全的位置",
    objectiveEn: "Your King is in check! Move it to safety",
    correctMove: "Kd1",
    alternativeMoves: ["Kd2", "Kf1", "Kd3", "Ke1"],
    hint: "将王移动到不被后攻击的位置",
    hintEn: "Move the King to a square not attacked by the Queen",
  },
  {
    id: 8,
    title: "吃子 (Capturing)",
    titleEn: "Capturing",
    description: "通过移动到对方棋子所在的格子来吃子。",
    descriptionEn: "Capture pieces by moving to the square they occupy.",
    fen: "4k3/8/3p4/4N3/8/8/8/4K3 w - - 0 1",
    objective: "用马吃掉黑兵",
    objectiveEn: "Capture the black pawn with the knight",
    correctMove: "Nxd6",
    hint: "马可以跳到d6吃掉兵",
    hintEn: "The knight can jump to d6 to capture the pawn",
  },
  {
    id: 9,
    title: "将死 (Checkmate)",
    titleEn: "Checkmate",
    description: "将死意味着对方王无法逃脱将军，游戏结束！",
    descriptionEn: "Checkmate means the King cannot escape check. Game over!",
    fen: "k7/8/1K6/8/8/8/8/R7 w - - 0 1",
    objective: "用车将死黑王",
    objectiveEn: "Checkmate the black King with the rook",
    correctMove: "Ra8#",
    hint: "将车移动到a8，黑王无处可逃",
    hintEn: "Move the rook to a8, the black King has nowhere to go",
  },
  {
    id: 10,
    title: "王车易位 (Castling)",
    titleEn: "Castling",
    description: "王车易位是一个特殊移动：王移动两格向车的方向，车跳过王。条件：王和车都没有移动过，中间没有棋子，王不能处于将军状态。",
    descriptionEn: "Castling is a special move: King moves two squares toward a rook, and the rook jumps over. Requirements: neither has moved, no pieces between them, King not in check.",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
    objective: "进行短易位 (O-O)",
    objectiveEn: "Perform kingside castling (O-O)",
    correctMove: "O-O",
    hint: "点击e1的王，然后点击g1",
    hintEn: "Click the King on e1, then click g1",
  },
];

class ChessGame extends Component {
  state = {
    fen: "start",
    history: [],
    squareStyles: {},
    pieceSquare: "",
    gameOver: false,
    gameStatus: "White to move",
    gameMode: "ai", // "ai", "coach", or "tutorial"
    playerColor: "w",
    aiThinking: false,
    aiDifficulty: 2, // Default to Medium
    // Coach mode state
    analysis: null,
    suggestedMoves: [],
    strategicAdvice: [],
    showHints: true,
    lastAIExplanation: "",
    // Player tracking
    playerName: localStorage.getItem('chess_player_name') || "",
    gameStartTime: null,
    gameSaved: false,
    // Pending game result (before user confirms submission)
    pendingResult: null, // { result: 'win'/'loss'/'draw', status: 'Checkmate!...' }
    showResultDialog: false,
    // Rating state
    oldRating: null,
    newRating: null,
    ratingDelta: 0,
    ratingProcessed: false,
    // Save/Load state
    hasSavedGame: false,
    showSaveNotification: false,
    // Tutorial mode state
    currentLesson: 0,
    lessonComplete: false,
    showTutorialHint: false,
    tutorialProgress: JSON.parse(localStorage.getItem('chess_tutorial_progress') || '[]'),
    // Retrospect mode state
    showRetrospect: false,
    evaluations: [], // { score, winProbability } for each position
    criticalMoments: [], // analyzed critical moments
    learningTips: [], // generated tips based on game
    retrospectMoveIndex: -1, // current move being viewed in retrospect
    showPatternLibrary: false,
    // Best move comparison
    retrospectBestMove: null, // { san, score, winProb } best move at current position
    retrospectAnalyzing: false, // loading state for analysis
    // Mobile fullscreen mode — only default on small screens
    isFullscreen: typeof window !== 'undefined' && window.innerWidth <= 820,
    showFullscreenCoach: false,
    boardWidth: fitSquare(chessBoardOptions()),
    coachAnalyzing: false, // the recommended moves are being worked out
    tiltOn: readTiltPref(),
  };

  game = null;
  _engineLoading = false;
  _pendingAnalysis = false;

  componentDidMount() {
    this.game = new Chess();
    initSound();
    this.setState({
      gameStartTime: Date.now(),
      hasSavedGame: hasSavedGame(),
    });
    this.updateGameStatus();
    // Start the engine that works out the recommended moves (does nothing where it cannot run)
    this._engineLoading = true;
    prewarmChessEngine().then((ok) => {
      this._engineLoading = false;
      if (!this.game) return;
      // Something was waiting for the engine: redo it now, with the engine or, if it could
      // not start, with the built-in search straight away
      if (this._pendingAnalysis) this.updateAnalysis();
    });
    this.updateAnalysis();
    // Responsive board sizing — auto-fit to available viewport
    this._cleanupResize = autoResize(
      (size) => { if (size !== this.state.boardWidth) this.setState({ boardWidth: size }); },
      chessBoardOptions
    );
  }

  componentWillUnmount() {
    this.game = null;
    clearTimeout(this._engineWaitTimer);
    if (this._cleanupResize) {
      this._cleanupResize();
    }
  }

  updateAnalysis = () => {
    if (!this.game) return;
    if (this.state.gameMode !== "coach" && this.state.gameMode !== "ai") return;

    // The quick built-in read of the position shows at once; the recommended moves follow
    // from the engine (or the built-in search) a moment later
    const analysis = analyzePosition(this.game);
    const strategicAdvice = getStrategicAdvice(this.game);

    const historyMoves = this.game.history();
    if (historyMoves.length < 12) {
      // Detect current opening
      const opening = detectOpening(GAME_TYPE.CHESS, historyMoves);
      if (opening && !strategicAdvice.find(a => a.type === 'opening')) {
        strategicAdvice.unshift({
          priority: 'info',
          type: 'opening',
          cn: `当前开局: ${opening.name}`,
          en: `Opening: ${opening.name}${opening.eco ? ` (${opening.eco})` : ''}`,
        });
      }
    }

    clearTimeout(this._engineWaitTimer);
    this._pendingAnalysis = false;

    // Recommendations are for the player to move; while the opponent thinks there is nothing to show
    if (!this.isPlayerTurn() || this.game.game_over()) {
      this.setState({ analysis, strategicAdvice, suggestedMoves: [], coachAnalyzing: false });
      return;
    }

    this.setState({ analysis, strategicAdvice, suggestedMoves: [], coachAnalyzing: true });
    const key = this.game.fen();

    if (isChessEngineReady()) {
      this._suggestWithEngine(key);
    } else if (this._engineLoading) {
      // The engine is still starting. Give it a few seconds rather than answering with
      // the much weaker built-in search. If it is slower than that, show the built-in
      // answer meanwhile; _pendingAnalysis stays set so the engine redoes it once it is up.
      this._pendingAnalysis = true;
      this._engineWaitTimer = setTimeout(() => this._suggestBuiltin(key), ENGINE_WAIT_MS);
    } else {
      // No engine here: the built-in search is synchronous, so let "analyzing" paint first
      requestAnimationFrame(() => setTimeout(() => this._suggestBuiltin(key), 20));
    }
  };

  _suggestWithEngine = async (key) => {
    let engineMoves;
    try {
      engineMoves = await getTopMovesEngineChess(this.game, 2);
    } catch (err) {
      engineMoves = [];
    }
    // Unmounted, the board moved on, or a newer request replaced this one
    if (!this.game || this.game.fen() !== key || engineMoves === null) return;
    if (!engineMoves || engineMoves.length === 0) {
      this._suggestBuiltin(key);
      return;
    }
    // The position's evaluation comes from the same search as the moves (White's view)
    const analysis = analyzePosition(this.game, engineMoves[0].score);
    this._finishSuggestions(key, engineMoves, { analysis });
  };

  // The built-in search looks only two moves ahead: three took 5-50 s and froze the page.
  // It is the fallback where the engine cannot run.
  _suggestBuiltin = (key) => {
    if (!this.game || this.game.fen() !== key) return;
    this._finishSuggestions(key, getTopMoves(this.game, 2, 2));
  };

  _finishSuggestions = (key, found, extra = {}) => {
    if (!this.game || this.game.fen() !== key) return;
    let suggestedMoves = found;

    // Enhance with opening book in the first 12 moves
    const historyMoves = this.game.history();
    if (historyMoves.length < 12) {
      const bookMoves = getOpeningBookMoves(historyMoves);
      if (bookMoves.length > 0) {
        // Boost book moves to the top if they appear in suggestions
        const boosted = [];
        const remaining = [];
        for (const sm of suggestedMoves) {
          if (bookMoves.includes(sm.san?.replace(/[+#!?]/g, ''))) {
            boosted.push({ ...sm, explanation: '📖 Opening book: ' + (sm.explanation || sm.san) });
          } else {
            remaining.push(sm);
          }
        }
        // If no engine moves match the book, add the first book move as a suggestion
        if (boosted.length === 0) {
          const legalMoves = this.game.moves({ verbose: true });
          const bookLegal = legalMoves.find(m => bookMoves.includes(m.san.replace(/[+#!?]/g, '')));
          if (bookLegal) {
            boosted.push({
              rank: 0,
              san: bookLegal.san,
              move: bookLegal,
              winProbability: 0.55,
              explanation: '📖 Opening book move',
            });
          }
        }
        suggestedMoves = [...boosted, ...remaining].slice(0, 2);
        // Re-number ranks
        suggestedMoves = suggestedMoves.map((m, i) => ({ ...m, rank: i + 1 }));
      }
    }

    this.setState({ ...extra, suggestedMoves, coachAnalyzing: false }, () => this.refreshSuggestionHighlight());
  };

  toggleTilt = () => {
    const tiltOn = !this.state.tiltOn;
    try { localStorage.setItem(TILT_KEY, tiltOn ? 'on' : 'off'); } catch (_) { /* storage blocked */ }
    this.setState({ tiltOn });
  };

  // Highlight the best move's squares (coach mode only, to avoid clutter in AI), or clear
  refreshSuggestionHighlight = () => {
    const { gameMode, showHints, suggestedMoves, pieceSquare } = this.state;
    if (pieceSquare) return; // a selected piece's moves are showing
    if (gameMode === "coach" && showHints && suggestedMoves.length > 0 && this.isPlayerTurn()) {
      const bestMove = suggestedMoves[0].move;
      this.highlightSuggestedMove(bestMove.from, bestMove.to);
    } else {
      this.removeHighlightSquare();
    }
  };

  highlightSuggestedMove = (from, to) => {
    this.setState({
      squareStyles: {
        [from]: { backgroundColor: "rgba(46, 204, 113, 0.5)" },
        [to]: { backgroundColor: "rgba(46, 204, 113, 0.7)" },
      },
    });
  };

  updateGameStatus = () => {
    if (!this.game) return;

    let status = "";
    const turn = this.game.turn() === "w" ? "White" : "Black";

    if (this.game.game_over()) {
      let gameResult = "draw";

      if (this.game.in_checkmate()) {
        const winner = this.game.turn() === "w" ? "Black" : "White";
        status = `Checkmate! ${winner} wins!`;
        // Determine if player won or lost
        const winnerColor = this.game.turn() === "w" ? "b" : "w";
        gameResult = winnerColor === this.state.playerColor ? "win" : "loss";
      } else if (this.game.in_stalemate()) {
        status = "Draw by stalemate";
      } else if (this.game.in_threefold_repetition()) {
        status = "Draw by repetition";
      } else if (this.game.insufficient_material()) {
        status = "Draw by insufficient material";
      } else if (this.game.in_draw()) {
        status = "Draw";
      }

      // Don't auto-save - show dialog for user to decide
      if (!this.state.gameSaved && !this.state.pendingResult) {
        this.setState({
          gameOver: true,
          gameStatus: status,
          pendingResult: { result: gameResult, status: status },
          showResultDialog: true,
        });
        // Process rating in AI/coach mode
        if ((this.state.gameMode === 'ai' || this.state.gameMode === 'coach') && !this.state.ratingProcessed) {
          this.processGameResult(gameResult, status);
        }
      } else {
        this.setState({ gameOver: true, gameStatus: status });
      }
    } else {
      if (this.game.in_check()) {
        status = `${turn} is in check!`;
      } else {
        status = `${turn} to move`;
      }
      this.setState({ gameOver: false, gameStatus: status });
    }
  };

  // Submit the game score
  submitScore = async () => {
    if (!this.state.pendingResult || this.state.gameSaved) return;

    await this.saveGame(this.state.pendingResult.result);
    this.setState({ showResultDialog: false });
  };

  // Continue exploring without submitting score
  continueExploring = () => {
    this.setState({ showResultDialog: false });
  };

  // Process game result and update rating
  processGameResult = async (result, status) => {
    if (this.state.ratingProcessed) return;
    
    const gameType = GAME_TYPE.CHESS;
    const oldRatingData = getRating(gameType);
    const oldRating = oldRatingData.rating;
    
    // Map result string to RESULT constant
    let resultValue;
    if (result === 'win') resultValue = RESULT.WIN;
    else if (result === 'loss') resultValue = RESULT.LOSS;
    else resultValue = RESULT.DRAW;
    
    // Record result and get new rating
    const { newRating, delta } = await recordResult({
      gameType,
      result: resultValue,
      difficulty: this.state.aiDifficulty,
      userId: this.props.user,
    });
    
    this.setState({
      oldRating,
      newRating,
      ratingDelta: delta,
      ratingProcessed: true,
    });
  };

  // Close result dialog
  closeResultDialog = () => {
    this.setState({ showResultDialog: false });
  };

  // Handle rematch request
  handleRematch = () => {
    this.closeResultDialog();
    this.resetGame();
  };

  saveGame = async (result) => {
    if (this.state.gameSaved || !this.state.playerName) return;

    const duration = this.state.gameStartTime
      ? Math.round((Date.now() - this.state.gameStartTime) / 1000)
      : 0;

    // Get user ID if logged in (passed from App via props)
    const userId = this.props.user?.uid || null;

    await saveGameResult({
      playerName: this.state.playerName,
      playerColor: this.state.playerColor,
      opponent: this.state.gameMode,
      difficulty: this.state.aiDifficulty,
      result: result,
      moves: this.state.history.length,
      duration: duration,
    }, userId);

    this.setState({ gameSaved: true });
  };

  setPlayerName = (name) => {
    this.setState({ playerName: name });
    localStorage.setItem('chess_player_name', name);
  };


  getCoachMove = () => {
    const level = this.state.aiDifficulty;
    const coachDepthMap = { 1: 1, 2: 1, 3: 2, 4: 2 };
    const depth = coachDepthMap[level] || 1;

    const candidates = getTopMoves(this.game, 4, depth);
    if (!candidates || candidates.length === 0) return null;

    // Forgiving move policy: prefer top-2 but occasionally choose top-3/4
    // to reduce engine-like punishment and create recovery windows.
    const roll = Math.random();
    let pickIndex = 0;
    if (roll > 0.55 && candidates.length > 1) pickIndex = 1;
    if (roll > 0.80 && candidates.length > 2) pickIndex = 2;
    if (roll > 0.93 && candidates.length > 3) pickIndex = 3;

    return candidates[pickIndex].san;
  };

  makeAIMove = () => {
    if (!this.game || this.state.gameOver || this.game.game_over()) return;
    if (this.game.turn() === this.state.playerColor) return;

    this.setState({ aiThinking: true });

    setTimeout(() => {
      const bestMove = this.state.gameMode === "coach"
        ? this.getCoachMove()
        : findBestMove(this.game, this.state.aiDifficulty);
      if (bestMove && this.game) {
        // Get explanation for coach & AI modes
        let explanation = "";
        if (this.state.gameMode === "coach" || this.state.gameMode === "ai") {
          explanation = explainAIMove(this.game, bestMove);
        }

        const aiMove = this.game.move(bestMove);
        this.playMoveFeedback(aiMove);
        this.setState({
          fen: this.game.fen(),
          history: this.game.history({ verbose: true }),
          aiThinking: false,
          lastAIExplanation: explanation,
        });
        this.recordEvaluation();
        this.updateGameStatus();
        this.updateAnalysis();
      } else {
        this.setState({ aiThinking: false });
      }
    }, 100);
  };

  highlightSquare = (sourceSquare, squaresToHighlight) => {
    const highlightStyles = [sourceSquare, ...squaresToHighlight].reduce(
      (a, c) => {
        return {
          ...a,
          [c]: {
            background:
              "radial-gradient(circle, rgba(255,255,0,0.4) 25%, transparent 25%)",
            borderRadius: "50%",
          },
        };
      },
      {}
    );

    if (sourceSquare) {
      highlightStyles[sourceSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
    }

    this.setState(({ squareStyles }) => ({
      squareStyles: { ...squareStyles, ...highlightStyles },
    }));
  };

  removeHighlightSquare = () => {
    this.setState({ squareStyles: {} });
  };

  // Sound + haptic for the move that was just played (this.game already reflects it)
  playMoveFeedback = (move) => {
    if (!this.game || !move) return;
    // Tutorial lessons are always played as the side to move, so the learner "wins" them
    const playerColor = this.state.gameMode === "tutorial" ? move.color : this.state.playerColor;
    chessMoveFeedback(this.game, move, playerColor);
  };

  // One line for the collapsed coach sheet: the best move and who is ahead
  renderCoachSummary = () => {
    const { suggestedMoves, analysis, aiThinking, coachAnalyzing } = this.state;
    if (aiThinking) return <span className="chip">Opponent thinking…</span>;
    if (coachAnalyzing && this.isPlayerTurn()) return <span className="chip">Analyzing…</span>;
    const best = suggestedMoves[0];
    if (!best || !this.isPlayerTurn()) return analysis ? <span className="chip">{analysis.evaluation}</span> : null;
    const white = this.state.playerColor === 'w';
    const chance = analysis ? Math.round((white ? analysis.winProbability.white : analysis.winProbability.black) * 100) : null;
    return (
      <>
        <span className="chip gold">{best.san}</span>
        {chance !== null && <span className="chip">{chance}%</span>}
      </>
    );
  };

  isPlayerTurn = () => {
    if (this.state.gameMode === "human" || this.state.gameMode === "tutorial") return true;
    return this.game && this.game.turn() === this.state.playerColor;
  };

  onSquareClick = (square) => {
    if (!this.game || this.state.aiThinking) return;
    if (this.state.gameOver && this.state.gameMode !== "tutorial") return;
    if (this.state.gameMode === "tutorial" && this.state.lessonComplete) return;
    if (!this.isPlayerTurn()) return;

    // Side effects (moving, highlighting, sound) happen here, not inside a state updater,
    // which React expects to be pure
    const { pieceSquare } = this.state;

    if (pieceSquare === square) {
      this.removeHighlightSquare();
      if (this.state.gameMode === "coach") {
        setTimeout(this.refreshSuggestionHighlight, 0);
      }
      this.setState({ pieceSquare: "" });
      return;
    }

    if (pieceSquare) {
      const move = this.game.move({
        from: pieceSquare,
        to: square,
        promotion: "q",
      });

      if (move !== null) {
        this.playMoveFeedback(move);
        this.removeHighlightSquare();

        // Handle tutorial mode
        if (this.state.gameMode === "tutorial") {
          this.checkTutorialMove(move);
          this.setState({
            fen: this.game.fen(),
            pieceSquare: "",
          });
          return;
        }

        this.recordEvaluation();

        this.setState({
          fen: this.game.fen(),
          history: this.game.history({ verbose: true }),
          pieceSquare: "",
          lastAIExplanation: "",
        });

        // Defer updateGameStatus and AI move to after setState completes
        setTimeout(() => {
          this.updateGameStatus();
          if (this.state.gameMode === "ai" || this.state.gameMode === "coach") {
            setTimeout(() => this.makeAIMove(), 300);
          }
          // Update analysis for both AI and coach mode (for hint button)
          setTimeout(() => this.updateAnalysis(), 100);
        }, 0);
        return;
      }
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.game.turn()) {
      const moves = this.game.moves({
        square: square,
        verbose: true,
      });
      const squaresToHighlight = moves.map((move) => move.to);
      this.highlightSquare(square, squaresToHighlight);
      selectFeedback();
      this.setState({ pieceSquare: square });
      return;
    }

    this.setState({ pieceSquare: "" });
  };

  onDrop = ({ sourceSquare, targetSquare }) => {
    if (!this.game || this.state.aiThinking) return;
    if (this.state.gameOver && this.state.gameMode !== "tutorial") return;
    if (this.state.gameMode === "tutorial" && this.state.lessonComplete) return;
    if (!this.isPlayerTurn()) return;

    const piece = this.game.get(sourceSquare);
    if (!piece || piece.color !== this.game.turn()) {
      return;
    }

    const move = this.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return;

    this.playMoveFeedback(move);
    this.removeHighlightSquare();

    // Handle tutorial mode
    if (this.state.gameMode === "tutorial") {
      this.checkTutorialMove(move);
      this.setState({
        fen: this.game.fen(),
        pieceSquare: "",
      });
      return;
    }

    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      pieceSquare: "",
      lastAIExplanation: "",
    });
    this.recordEvaluation();
    this.updateGameStatus();

    if (this.state.gameMode === "ai" || this.state.gameMode === "coach") {
      setTimeout(() => this.makeAIMove(), 300);
    }

    // Update analysis for both AI and coach mode (for hint button)
    setTimeout(() => this.updateAnalysis(), 100);
  };

  onMouseOverSquare = (square) => {
    if (!this.game || this.state.gameOver || this.state.aiThinking) return;
    if (!this.isPlayerTurn()) return;
    if (this.state.pieceSquare) return; // Don't override selection highlight

    const piece = this.game.get(square);
    if (!piece || piece.color !== this.game.turn()) return;

    const moves = this.game.moves({
      square: square,
      verbose: true,
    });

    if (moves.length === 0) return;

    const squaresToHighlight = moves.map((move) => move.to);
    this.highlightSquare(square, squaresToHighlight);
  };

  onMouseOutSquare = () => {
    if (!this.state.pieceSquare) {
      if (this.state.gameMode === "coach" && this.state.showHints) {
        this.refreshSuggestionHighlight();
      } else {
        this.removeHighlightSquare();
      }
    }
  };

  resetGame = () => {
    if (!this.game) return;
    this.game.reset();
    clearCache(); // Clear AI cache for new game

    // Initialize with starting position evaluation
    const initialEval = quickEvaluate(this.game);

    this.setState({
      fen: this.game.fen(),
      history: [],
      squareStyles: {},
      pieceSquare: "",
      gameOver: false,
      aiThinking: false,
      lastAIExplanation: "",
      analysis: null,
      suggestedMoves: [],
      coachAnalyzing: false,
      gameStartTime: Date.now(),
      gameSaved: false,
      // Reset retrospect state
      evaluations: [initialEval],
      criticalMoments: [],
      learningTips: [],
      showRetrospect: false,
      retrospectMoveIndex: -1,
      pendingResult: null,
      showResultDialog: false,
      // Reset rating state
      oldRating: null,
      newRating: null,
      ratingDelta: 0,
      ratingProcessed: false,
    });
    this.updateGameStatus();

    if (this.state.gameMode === "coach") {
      setTimeout(() => this.updateAnalysis(), 100);
    }

    if ((this.state.gameMode === "ai" || this.state.gameMode === "coach") && this.state.playerColor === "b") {
      setTimeout(() => this.makeAIMove(), 500);
    }
  };

  undoMove = () => {
    if (!this.game || this.state.history.length === 0 || this.state.aiThinking) return;

    const isAIMode = this.state.gameMode === "ai" || this.state.gameMode === "coach";

    // In AI mode, we want to land on the player's turn after undo.
    // Check the last move color to decide how many moves to undo.
    if (isAIMode) {
      const lastHistory = this.state.history[this.state.history.length - 1];
      const lastMoveColor = lastHistory?.color;

      if (lastMoveColor === this.state.playerColor) {
        // Last move was by the player (e.g. game ended on player's winning move) — undo 1
        this.game.undo();
      } else if (this.state.history.length >= 2) {
        // Last move was by AI — undo AI's move and the player's move before it
        this.game.undo();
        this.game.undo();
      } else {
        this.game.undo();
      }
    } else {
      this.game.undo();
    }

    // Determine new game status directly from the engine (avoid race conditions)
    const isGameOver = this.game.game_over();

    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      squareStyles: {},
      pieceSquare: "",
      lastAIExplanation: "",
      gameOver: isGameOver,
      pendingResult: null,
      showResultDialog: false,
    }, () => {
      this.updateGameStatus();

      // After undo, if it's the AI's turn, trigger AI move
      if (isAIMode && !isGameOver && this.game.turn() !== this.state.playerColor) {
        setTimeout(() => this.makeAIMove(), 300);
      }

      if (this.state.gameMode === "coach" && !isGameOver) {
        setTimeout(() => this.updateAnalysis(), 100);
      }
    });
  };

  // Record evaluation after a move
  recordEvaluation = () => {
    if (!this.game) return;
    const evaluation = quickEvaluate(this.game);
    this.setState(state => ({
      evaluations: [...state.evaluations, evaluation],
    }));
  };

  // Enter retrospect mode - analyze the game
  enterRetrospect = () => {
    const { history, evaluations, playerColor } = this.state;
    if (history.length < 2) return;

    // Analyze the game
    const criticalMoments = analyzeGame(history, evaluations);
    const learningTips = generateLearningTips(criticalMoments, playerColor);

    this.setState({
      showRetrospect: true,
      criticalMoments,
      learningTips,
      retrospectMoveIndex: history.length - 1,
    });
  };

  // Exit retrospect mode
  exitRetrospect = () => {
    this.setState({
      showRetrospect: false,
      retrospectMoveIndex: -1,
    });
  };

  // Go to a specific move in retrospect
  goToMove = (moveIndex) => {
    if (!this.game || moveIndex < -1 || moveIndex >= this.state.history.length) return;

    // Create a new game and replay moves to get to BEFORE the move was played
    const tempGame = new Chess();
    for (let i = 0; i < moveIndex; i++) {
      const move = this.state.history[i];
      tempGame.move(move.san);
    }

    // Get the position before the move
    const fenBeforeMove = moveIndex === 0 ? 'start' : tempGame.fen();

    // Now play the move to show the position after
    if (moveIndex >= 0) {
      tempGame.move(this.state.history[moveIndex].san);
    }

    this.setState({
      retrospectMoveIndex: moveIndex,
      fen: moveIndex === -1 ? 'start' : tempGame.fen(),
      retrospectBestMove: null,
      retrospectAnalyzing: true,
    });

    // Calculate best move for the position BEFORE the move was played
    if (moveIndex >= 0) {
      setTimeout(() => {
        const positionGame = new Chess(fenBeforeMove === 'start' ? undefined : fenBeforeMove);
        const bestMove = getBestMoveForRetrospect(positionGame, 2);

        if (bestMove) {
          const actualMove = this.state.history[moveIndex];
          const wasBestMove = actualMove.san === bestMove.san;

          this.setState({
            retrospectBestMove: {
              san: bestMove.san,
              score: bestMove.score,
              winProb: bestMove.winProbability,
              wasBestMove: wasBestMove,
              actualMove: actualMove.san,
              scoreDiff: Math.abs(bestMove.score - (this.state.evaluations[moveIndex + 1]?.score || 0)),
            },
            retrospectAnalyzing: false,
          });
        } else {
          this.setState({ retrospectAnalyzing: false });
        }
      }, 50);
    } else {
      this.setState({ retrospectAnalyzing: false });
    }
  };

  // Navigate to previous critical moment
  prevCriticalMoment = () => {
    const { criticalMoments, retrospectMoveIndex } = this.state;
    const prevMoment = [...criticalMoments]
      .reverse()
      .find(m => m.moveIndex < retrospectMoveIndex);
    if (prevMoment) {
      this.goToMove(prevMoment.moveIndex);
    }
  };

  // Navigate to next critical moment
  nextCriticalMoment = () => {
    const { criticalMoments, retrospectMoveIndex } = this.state;
    const nextMoment = criticalMoments.find(m => m.moveIndex > retrospectMoveIndex);
    if (nextMoment) {
      this.goToMove(nextMoment.moveIndex);
    }
  };

  // Toggle pattern library display
  togglePatternLibrary = () => {
    this.setState(state => ({ showPatternLibrary: !state.showPatternLibrary }));
  };

  // Save current game progress
  saveCurrentGame = () => {
    if (!this.game || this.state.gameOver) return;

    const success = saveGameState({
      fen: this.game.fen(),
      history: this.state.history,
      gameMode: this.state.gameMode,
      playerColor: this.state.playerColor,
      aiDifficulty: this.state.aiDifficulty,
      playerName: this.state.playerName,
      gameStartTime: this.state.gameStartTime,
    });

    if (success) {
      this.setState({ showSaveNotification: true, hasSavedGame: true });
      setTimeout(() => this.setState({ showSaveNotification: false }), 2000);
    }
  };

  // Load saved game
  loadSavedGame = () => {
    const savedGame = loadGameState();
    if (!savedGame || !this.game) return;

    this.game.load(savedGame.fen);
    this.setState({
      fen: savedGame.fen,
      history: savedGame.history || [],
      gameMode: savedGame.gameMode || "ai",
      playerColor: savedGame.playerColor || "w",
      aiDifficulty: savedGame.aiDifficulty || 2,
      playerName: savedGame.playerName || "",
      gameStartTime: savedGame.gameStartTime || Date.now(),
      gameOver: false,
      pieceSquare: "",
      squareStyles: {},
    });
    this.updateGameStatus();

    if (savedGame.gameMode === "coach") {
      setTimeout(() => this.updateAnalysis(), 100);
    }
  };

  // Delete saved game
  clearSavedGame = () => {
    deleteSavedGame();
    this.setState({ hasSavedGame: false });
  };

  // Tutorial methods
  startTutorial = (lessonIndex = 0) => {
    const lesson = TUTORIAL_LESSONS[lessonIndex];
    if (!lesson || !this.game) return;

    this.game.load(lesson.fen);
    this.setState({
      gameMode: "tutorial",
      currentLesson: lessonIndex,
      fen: lesson.fen,
      history: [],
      gameOver: false,
      lessonComplete: false,
      showTutorialHint: false,
      pieceSquare: "",
      squareStyles: {},
      gameStatus: lesson.objective,
    });
  };

  nextLesson = () => {
    const nextIndex = this.state.currentLesson + 1;
    if (nextIndex < TUTORIAL_LESSONS.length) {
      this.startTutorial(nextIndex);
    }
  };

  prevLesson = () => {
    const prevIndex = this.state.currentLesson - 1;
    if (prevIndex >= 0) {
      this.startTutorial(prevIndex);
    }
  };

  checkTutorialMove = (move) => {
    const lesson = TUTORIAL_LESSONS[this.state.currentLesson];
    if (!lesson) return false;

    const isCorrect = move.san === lesson.correctMove ||
      (lesson.alternativeMoves && lesson.alternativeMoves.includes(move.san));

    if (isCorrect) {
      // Mark lesson as complete
      const progress = [...this.state.tutorialProgress];
      if (!progress.includes(lesson.id)) {
        progress.push(lesson.id);
        localStorage.setItem('chess_tutorial_progress', JSON.stringify(progress));
      }
      this.setState({
        lessonComplete: true,
        tutorialProgress: progress,
        gameStatus: "🎉 正确！Correct!",
      });
    } else {
      // Wrong move - undo it
      this.game.undo();
      this.setState({
        fen: this.game.fen(),
        gameStatus: "❌ 再试一次 Try again",
      });
    }

    return isCorrect;
  };

  toggleTutorialHint = () => {
    this.setState(state => ({ showTutorialHint: !state.showTutorialHint }));
  };

  setGameMode = (mode) => {
    if (mode === "tutorial") {
      this.startTutorial(0);
      return;
    }
    this.setState({ gameMode: mode }, () => {
      this.resetGame();
    });
  };

  setPlayerColor = (color) => {
    this.setState({ playerColor: color }, () => {
      this.resetGame();
    });
  };

  setDifficulty = (level) => {
    this.setState({ aiDifficulty: level });
  };

  toggleHints = () => {
    this.setState(
      (state) => ({ showHints: !state.showHints }),
      () => {
        if (this.state.showHints) {
          this.updateAnalysis();
        } else {
          this.removeHighlightSquare();
        }
      }
    );
  };

  playSuggestedMove = (move) => {
    if (!this.game || this.state.gameOver || this.state.aiThinking) return;

    const played = this.game.move(move.san);
    this.playMoveFeedback(played);
    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      pieceSquare: "",
      lastAIExplanation: "",
    });
    this.updateGameStatus();

    if (this.state.gameMode === "coach" || this.state.gameMode === "ai") {
      setTimeout(() => this.makeAIMove(), 300);
    }
  };

  render() {
    const {
      fen, squareStyles, gameStatus, gameOver, history,
      gameMode, playerColor, aiThinking, aiDifficulty,
      analysis, suggestedMoves, strategicAdvice, showHints, lastAIExplanation,
      hasSavedGame, showSaveNotification, pendingResult, showResultDialog,
      currentLesson, lessonComplete, showTutorialHint, tutorialProgress,
      showRetrospect, evaluations, criticalMoments, learningTips,
      retrospectMoveIndex, showPatternLibrary,
      retrospectBestMove, retrospectAnalyzing,
      isFullscreen, boardWidth, coachAnalyzing,
    } = this.state;

    const boardOrientation = (gameMode === "ai" || gameMode === "coach") && playerColor === "b" ? "black" : "white";
    const currentTutorialLesson = TUTORIAL_LESSONS[currentLesson];

    // Fullscreen mode — board fills screen, professional game layout
    if (isFullscreen) {
      const { showFullscreenCoach } = this.state;
      const hasCoachContent = gameMode === 'coach' || (analysis || lastAIExplanation || suggestedMoves.length > 0);
      const diffLabels = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Master' };
      const modeShort = { ai: 'AI', coach: 'Coach', tutorial: 'Tutorial', human: 'Human' };
      // opponent color/avatar
      const oppColor = playerColor === 'w' ? 'b' : 'w';
      const oppIcon = <Icon name={gameMode === 'tutorial' ? 'learn' : (gameMode === 'human' ? 'profile' : 'coach')} size={18} />;
      const oppName = gameMode === 'tutorial' ? 'Tutorial' : gameMode === 'human' ? 'Opponent' : `${modeShort[gameMode] || 'AI'} · ${diffLabels[aiDifficulty] || 'Medium'}`;
      const turn = this.game ? this.game.turn() : 'w';
      const isPlayerTurn = turn === playerColor && !aiThinking && !gameOver;
      const lastMove = history.length > 0 ? history[history.length - 1] : null;
      const lastMoveText = lastMove ? `${Math.floor((history.length - 1) / 2) + 1}${history.length % 2 === 1 ? '.' : '...'} ${lastMove.san}` : '';
      // Fullscreen has no sub-nav/tab-bar chrome; recompute so board fills screen
      const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
      const fsBoardWidth = Math.min(vw - 16, vh - 220);
      return (
        <div className="chess-fullscreen-mode">
          {/* Top Bar — icon actions only; mode info lives on player bars */}
          <div className="fs-top-bar">
            <button
              className="fs-icon-btn"
              onClick={() => this.setState({ isFullscreen: false })}
              title="Exit fullscreen"
              aria-label="Exit fullscreen"
            >
              <Icon name="close" size={16} />
            </button>
            <div className="fs-top-right">
              <button
                className={`fs-icon-btn fs-tilt-btn ${this.state.tiltOn ? 'active' : ''}`}
                onClick={this.toggleTilt}
                title={this.state.tiltOn ? 'Flat board' : '3D board'}
                aria-label={this.state.tiltOn ? 'Switch to flat board' : 'Switch to 3D board'}
                aria-pressed={this.state.tiltOn}
              >
                <Icon name="layers" size={16} />
              </button>
              {hasCoachContent && (
                <button
                  className={`fs-icon-btn ${showFullscreenCoach ? 'active' : ''}`}
                  onClick={() => this.setState({ showFullscreenCoach: !showFullscreenCoach })}
                  title="Coach"
                  aria-label="Toggle coach"
                >
                  <Icon name="hint" size={16} />
                </button>
              )}
              <button
                className="fs-icon-btn"
                onClick={() => this.setState({ isFullscreen: false })}
                title="Settings"
                aria-label="Settings"
              >
                <Icon name="settings" size={16} />
              </button>
            </div>
          </div>

          {/* Opponent info bar (with turn indicator) */}
          <div className={`fs-player-bar opponent ${turn === oppColor ? 'active-turn' : ''}`}>
            <span className={`fs-color-dot ${oppColor === 'w' ? 'white' : 'black'}`} />
            <span className="fs-player-icon">{oppIcon}</span>
            <span className="fs-player-name">{oppName}</span>
            {aiThinking && <span className="fs-thinking-dot" aria-label="thinking">…</span>}
            {lastMove && turn === playerColor && (
              <span className="fs-last-move">{lastMoveText}</span>
            )}
          </div>

          {/* Status text (directly above board, very compact) */}
          <div className={`fs-status ${gameOver ? 'game-over' : ''} ${aiThinking ? 'thinking' : ''}`}>
            {aiThinking
              ? 'Thinking…'
              : gameOver
                ? gameStatus
                : isPlayerTurn
                  ? <><Icon name="hand" size={16} /> Your turn</>
                  : `${turn === 'w' ? 'White' : 'Black'} to move`}
          </div>

          {/* Board */}
          <div className="fullscreen-board-area">
            <TiltStage width={fsBoardWidth} tilt={this.state.tiltOn ? boardTiltDegrees() : 0} className="chess-board-stage">
            <Chessboard
              id="chessboard-fullscreen"
              position={fen}
              width={fsBoardWidth}
              orientation={boardOrientation}
              onDrop={this.onDrop}
              onSquareClick={this.onSquareClick}
              squareStyles={squareStyles}
              boardStyle={this.state.tiltOn ? TILTED_BOARD_STYLE : { borderRadius: '4px' }}
              lightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              darkSquareStyle={{ backgroundColor: '#b58863' }}
              dropSquareStyle={{ boxShadow: 'inset 0 0 1px 4px rgb(255, 255, 0)' }}
              draggable={!aiThinking && (!gameOver || gameMode === 'tutorial') && !(gameMode === 'tutorial' && lessonComplete)}
            />
            </TiltStage>
          </div>

          {/* Self player bar (with turn indicator + rating) */}
          <div className={`fs-player-bar self ${turn === playerColor ? 'active-turn' : ''}`}>
            <span className={`fs-color-dot ${playerColor === 'w' ? 'white' : 'black'}`} />
            <span className="fs-player-icon"><Icon name="profile" size={16} /></span>
            <span className="fs-player-name">You</span>
            <RatingDisplay gameType={GAME_TYPE.CHESS} compact />
          </div>

          {/* Bottom Action Bar — icons only (labels in tooltips) */}
          <div className="fs-action-bar">
            <button
              className="fs-action-btn"
              onClick={this.undoMove}
              disabled={history.length === 0 || aiThinking}
              title="Undo last move"
              aria-label="Undo"
            >
              <span className="fs-act-icon">↩️</span>
            </button>
            <button
              className="fs-action-btn hint"
              onClick={() => suggestedMoves.length > 0 && this.playSuggestedMove(suggestedMoves[0].move)}
              disabled={suggestedMoves.length === 0 || aiThinking || !isPlayerTurn}
              title={suggestedMoves.length > 0 ? `Hint: ${suggestedMoves[0].san}` : (coachAnalyzing ? 'Analyzing…' : 'Hint')}
              aria-label="Hint"
            >
              <span className="fs-act-icon"><Icon name="hint" size={16} /></span>
            </button>
            <button
              className="fs-action-btn"
              onClick={this.newGame}
              title="New game"
              aria-label="New game"
            >
              <span className="fs-act-icon"><Icon name="reset" size={16} /></span>
            </button>
          </div>

          {/* Slide-in Coach Panel */}
          {showFullscreenCoach && (
            <CoachSheet
              title="Coach"
              summary={this.renderCoachSummary()}
              onClose={() => this.setState({ showFullscreenCoach: false })}
            >
              <>
                {analysis && (
                  <div className="analysis-section">
                    <div className="section-label">Win Probability</div>
                    <div className="win-probability">
                      <div className="prob-bar">
                        <div className="prob-white" style={{ width: `${analysis.winProbability.white * 100}%` }}>
                          {analysis.winProbability.white >= 0.15 && <span>{Math.round(analysis.winProbability.white * 100)}%</span>}
                        </div>
                        <div className="prob-black" style={{ width: `${analysis.winProbability.black * 100}%` }}>
                          {analysis.winProbability.black >= 0.15 && <span>{Math.round(analysis.winProbability.black * 100)}%</span>}
                        </div>
                      </div>
                      <div className="evaluation-text">{analysis.evaluation}</div>
                    </div>
                  </div>
                )}
                {lastAIExplanation && (
                  <div className="analysis-section">
                    <div className="section-label"><Icon name="coach" size={16} /> AI Move</div>
                    <div className="ai-explanation-box">{lastAIExplanation}</div>
                  </div>
                )}
                {coachAnalyzing && !aiThinking && this.isPlayerTurn() && (
                  <div className="analysis-section">
                    <div className="section-label">Recommended Moves</div>
                    <div className="analysis-pending" role="status">Analyzing…</div>
                  </div>
                )}
                {suggestedMoves.length > 0 && !aiThinking && this.isPlayerTurn() && (
                  <div className="analysis-section">
                    <div className="section-label">Recommended Moves</div>
                    <div className="suggested-moves-list">
                      {suggestedMoves.map((item, index) => (
                        <div key={index} className={`suggestion ${index === 0 ? 'best' : ''}`} onClick={() => this.playSuggestedMove(item.move)}>
                          <div className="suggestion-move">
                            <span className="rank">#{item.rank}</span>
                            <span className="san">{item.san}</span>
                            <span className="win-prob">{Math.round(item.winProbability * 100)}%</span>
                          </div>
                          <div className="suggestion-reason">{item.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {strategicAdvice && strategicAdvice.length > 0 && (
                  <div className="analysis-section">
                    <div className="section-label">Strategic Advice</div>
                    <div className="strategic-advice-list">
                      {strategicAdvice.map((advice, index) => (
                        <div key={index} className={`advice-item priority-${advice.priority}`}>
                          <p className="advice-cn">{advice.cn}</p>
                          <p className="advice-en">{advice.en}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!analysis && !lastAIExplanation && suggestedMoves.length === 0 && !coachAnalyzing && (
                  <div className="analysis-empty">Play a move to see coach analysis</div>
                )}
              </>
            </CoachSheet>
          )}

          {/* Game Result Dialog */}
          {showResultDialog && pendingResult && (
            <GameResultDialog
              isOpen={showResultDialog}
              result={pendingResult.result}
              message={pendingResult.status}
              oldRating={this.state.oldRating}
              newRating={this.state.newRating}
              gameType="chess"
              opponent={gameMode === 'ai' ? `AI (Lv${this.state.aiDifficulty})` : 'Human'}
              moves={history.length}
              onRematch={this.newGame}
              onHome={() => this.setState({ isFullscreen: false })}
              onClose={() => this.setState({ showResultDialog: false })}
            />
          )}
        </div>
      );
    }

    return (
      <div className="chess-game-layout">
        {/* Left Panel - Settings */}
        <div className="settings-panel">
          <div className="panel-title">Game Settings</div>

          {/* Game Mode Selector */}
          <div className="settings-section">
            <div className="section-label">Game Mode</div>
            <div className="mode-selector-vertical">
              <button
                className={`mode-btn ${gameMode === "ai" ? "active" : ""}`}
                onClick={() => this.setGameMode("ai")}
              >
                <Icon name="coach" size={16} /> vs AI
              </button>
              <button
                className={`mode-btn ${gameMode === "coach" ? "active" : ""}`}
                onClick={() => this.setGameMode("coach")}
              >
                <Icon name="learn" size={16} /> Coach
              </button>
              <button
                className={`mode-btn tutorial-btn ${gameMode === "tutorial" ? "active" : ""}`}
                onClick={() => this.setGameMode("tutorial")}
              >
                <Icon name="graduate" size={16} /> Tutorial
              </button>
            </div>
            <div className="online-hint">
              <Icon name="friends" size={16} /> Want to play vs Human?
              <br />
              Use <strong>Online</strong> mode in the navbar!
            </div>
          </div>

          {/* AI/Coach Options */}
          {(gameMode === "ai" || gameMode === "coach") && (
            <>
              <div className="settings-section">
                <div className="section-label">Play as</div>
                <div className="color-selector-vertical">
                  <button
                    className={`color-btn ${playerColor === "w" ? "active" : ""}`}
                    onClick={() => this.setPlayerColor("w")}
                  >
                    ⬜ White
                  </button>
                  <button
                    className={`color-btn ${playerColor === "b" ? "active" : ""}`}
                    onClick={() => this.setPlayerColor("b")}
                  >
                    ⬛ Black
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <div className="section-label">AI Difficulty</div>
                <div className="difficulty-selector-vertical">
                  {[1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      className={`diff-btn ${aiDifficulty === level ? "active" : ""}`}
                      onClick={() => this.setDifficulty(level)}
                    >
                      {level === 1 ? "Easy" : level === 2 ? "Medium" : level === 3 ? "Hard" : "Expert"}
                    </button>
                  ))}
                </div>
              </div>

              {gameMode === "coach" && (
                <div className="settings-section">
                  <div className="section-label">Show Hints</div>
                  <button
                    className={`toggle-btn ${showHints ? "active" : ""}`}
                    onClick={this.toggleHints}
                  >
                    {showHints ? "✓ Enabled" : "Disabled"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* View: tilted 3D board or flat */}
          <div className="settings-section">
            <div className="section-label">View</div>
            <button
              className={`toggle-btn ${this.state.tiltOn ? "active" : ""}`}
              onClick={this.toggleTilt}
              aria-pressed={this.state.tiltOn}
            >
              <Icon name="layers" size={16} /> {this.state.tiltOn ? "3D" : "2D"}
            </button>
          </div>

          {/* Game Controls in Settings */}
          {gameMode !== "tutorial" && !showRetrospect && (
            <div className="settings-section controls-section">
              <button className="btn btn-primary full-width" onClick={this.resetGame}>
                New Game
              </button>
              <button
                className="btn btn-secondary full-width"
                onClick={this.undoMove}
                disabled={history.length === 0 || aiThinking}
              >
                Undo Move
              </button>
              {(gameOver || history.length >= 4) && (
                <button
                  className="btn btn-retrospect full-width"
                  onClick={this.enterRetrospect}
                  disabled={history.length < 4}
                >
                  <Icon name="trend" size={16} /> Analyze Game
                </button>
              )}
            </div>
          )}

          {/* Retrospect Mode Controls */}
          {showRetrospect && (
            <div className="settings-section controls-section">
              <button className="btn btn-primary full-width" onClick={this.exitRetrospect}>
                ← Back to Game
              </button>
              <button
                className="btn btn-secondary full-width"
                onClick={this.togglePatternLibrary}
              >
                {showPatternLibrary ? <><Icon name="chart" size={16} /> Show Analysis</> : <><Icon name="learn" size={16} /> Pattern Library</>}
              </button>
            </div>
          )}

          {/* Save/Load Section */}
          {gameMode !== "tutorial" && (
            <div className="settings-section save-section">
              <div className="section-label">Save Progress</div>
              <button
                className="btn btn-save full-width"
                onClick={this.saveCurrentGame}
                disabled={gameOver || history.length === 0}
              >
                <Icon name="save" size={16} /> Save Game
              </button>
              {hasSavedGame && (
                <>
                  <button
                    className="btn btn-load full-width"
                    onClick={this.loadSavedGame}
                  >
                    📂 Load Game
                  </button>
                  <button
                    className="btn btn-delete full-width"
                    onClick={this.clearSavedGame}
                  >
                    <Icon name="delete" size={16} /> Delete Save
                  </button>
                </>
              )}
              {showSaveNotification && (
                <div className="save-notification">✓ Game Saved!</div>
              )}
            </div>
          )}
        </div>

        {/* Center Panel - Board */}
        <div className="board-panel">
          {(() => {
            const turn = this.game ? this.game.turn() : 'w';
            const oppColor = playerColor === 'w' ? 'b' : 'w';
            const diffLabels = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert' };
            const oppName = gameMode === 'tutorial' ? 'Tutorial' : gameMode === 'human' ? 'Opponent' : `AI · ${diffLabels[aiDifficulty] || 'Medium'}`;
            const oppIcon = <Icon name={gameMode === 'tutorial' ? 'learn' : gameMode === 'human' ? 'profile' : 'coach'} size={16} />;
            const lastMove = history.length > 0 ? history[history.length - 1] : null;
            const lastMoveText = lastMove ? `${Math.floor((history.length - 1) / 2) + 1}${history.length % 2 === 1 ? '.' : '…'} ${lastMove.san}` : '';
            const isPlayerTurn = turn === playerColor && !aiThinking && !gameOver;
            return (
              <>
                {/* Opponent bar — shows name + status inline */}
                <div className={`desk-player-bar opponent ${turn === oppColor && !gameOver ? 'active-turn' : ''}`}>
                  <span className={`desk-color-dot ${oppColor === 'w' ? 'white' : 'black'}`} aria-hidden="true" />
                  <span className="desk-player-icon" aria-hidden="true">{oppIcon}</span>
                  <span className="desk-player-name">{oppName}</span>
                  <span className="desk-bar-status" role="status" aria-live="polite">
                    {aiThinking
                      ? <span className="desk-thinking">thinking…</span>
                      : gameOver
                        ? <span className="desk-status-over">{gameStatus}</span>
                        : lastMove && turn === playerColor
                          ? <span className="desk-last-move" title={`Last move: ${lastMove.san}`}>{lastMoveText}</span>
                          : null}
                  </span>
                </div>
              </>
            );
          })()}

          {/* Chess Board */}
          <div className="board-container" style={{ touchAction: 'none' }}>
            <TiltStage width={boardWidth} tilt={this.state.tiltOn ? boardTiltDegrees() : 0} className="chess-board-stage">
            <Chessboard
              id="chessboard"
              position={fen}
              width={boardWidth}
              orientation={boardOrientation}
              onDrop={this.onDrop}
              onSquareClick={this.onSquareClick}
              onMouseOverSquare={this.onMouseOverSquare}
              onMouseOutSquare={this.onMouseOutSquare}
              squareStyles={squareStyles}
              boardStyle={this.state.tiltOn ? TILTED_BOARD_STYLE : {
                borderRadius: "8px",
                boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)",
              }}
              lightSquareStyle={{ backgroundColor: "#f0d9b5" }}
              darkSquareStyle={{ backgroundColor: "#b58863" }}
              dropSquareStyle={{ boxShadow: "inset 0 0 1px 4px rgb(255, 255, 0)" }}
              draggable={!aiThinking && (!gameOver || gameMode === "tutorial") && !(gameMode === "tutorial" && lessonComplete)}
            />
            </TiltStage>
            {/* Fullscreen button — shown on smaller screens */}
            <button
              className="fullscreen-toggle-btn"
              onClick={() => this.setState({ isFullscreen: true })}
              title="Enter fullscreen mode"
              aria-label="Enter fullscreen mode"
            >
              <Icon name="expand" size={16} /> Fullscreen
            </button>
          </div>

          {/* Self bar — shows rating + 'Your turn' status inline */}
          {(() => {
            const turn = this.game ? this.game.turn() : 'w';
            const isPlayerTurn = turn === playerColor && !aiThinking && !gameOver;
            return (
              <div className={`desk-player-bar self ${turn === playerColor && !gameOver ? 'active-turn' : ''}`}>
                <span className={`desk-color-dot ${playerColor === 'w' ? 'white' : 'black'}`} aria-hidden="true" />
                <span className="desk-player-icon" aria-hidden="true"><Icon name="profile" size={16} /></span>
                <span className="desk-player-name">You</span>
                {isPlayerTurn && (
                  <span className="desk-your-turn" role="status" aria-live="polite"><Icon name="hand" size={16} /> Your turn</span>
                )}
                <RatingDisplay gameType={GAME_TYPE.CHESS} compact />
              </div>
            );
          })()}

          {/* Inline toolbar — primary actions */}
          {gameMode !== "tutorial" && !showRetrospect && (
            <div className="chess-board-toolbar">
              <button
                className="tb-btn primary"
                onClick={this.resetGame}
                title="New Game"
              >
                <Icon name="reset" size={16} /> New
              </button>
              <button
                className="tb-btn"
                onClick={this.undoMove}
                disabled={history.length === 0 || aiThinking}
                title="Undo"
              >
                ↩️ Undo
              </button>
              <button
                className="tb-btn hint"
                onClick={() => suggestedMoves.length > 0 && this.playSuggestedMove(suggestedMoves[0].move)}
                disabled={suggestedMoves.length === 0 || aiThinking || !this.isPlayerTurn()}
                title={suggestedMoves.length > 0 ? `Hint: ${suggestedMoves[0].san}` : (coachAnalyzing ? 'Analyzing…' : 'No hint available')}
              >
                <Icon name="hint" size={16} /> Hint
              </button>
              {(gameOver || history.length >= 4) && (
                <button
                  className="tb-btn"
                  onClick={this.enterRetrospect}
                  disabled={history.length < 4}
                  title="Analyze Game"
                >
                  <Icon name="trend" size={16} /> Analyze
                </button>
              )}
            </div>
          )}

          {/* Game Result Dialog */}
          {showResultDialog && pendingResult && (
            <GameResultDialog
              isOpen={showResultDialog}
              result={pendingResult.result}
              message={pendingResult.status}
              oldRating={this.state.oldRating}
              newRating={this.state.newRating}
              gameType="chess"
              opponent={gameMode === 'ai' ? `AI (Lv${this.state.aiDifficulty})` : 'Opponent'}
              moves={history.length}
              onRematch={this.handleRematch}
              onReview={() => { this.closeResultDialog(); this.enterRetrospect(); }}
              onHome={this.closeResultDialog}
              onClose={this.closeResultDialog}
            />
          )}

          {/* Move History under board (not in tutorial mode) */}
          {gameMode !== "tutorial" && (
            <div className="move-history">
              <h3>Move History</h3>
              <div className="moves-list">
                {history.length === 0 ? (
                  <span className="no-moves">No moves yet</span>
                ) : (
                  history.map((move, index) => (
                    <span key={index} className="move">
                      {index % 2 === 0 && (
                        <span className="move-number">{Math.floor(index / 2) + 1}.</span>
                      )}
                      {move.san}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Analysis (Coach Mode) */}
        {gameMode === "coach" && (
          <div className="analysis-panel-right">
            <div className="panel-title">AI Analysis</div>

            {/* Win Probability */}
            {analysis && (
              <div className="analysis-section">
                <div className="section-label">Win Probability</div>
                <div className="win-probability">
                  <div className="prob-bar">
                    <div
                      className="prob-white"
                      style={{ width: `${analysis.winProbability.white * 100}%` }}
                    >
                      {analysis.winProbability.white >= 0.15 && (
                        <span>{Math.round(analysis.winProbability.white * 100)}%</span>
                      )}
                    </div>
                    <div
                      className="prob-black"
                      style={{ width: `${analysis.winProbability.black * 100}%` }}
                    >
                      {analysis.winProbability.black >= 0.15 && (
                        <span>{Math.round(analysis.winProbability.black * 100)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="evaluation-text">{analysis.evaluation}</div>
                </div>
              </div>
            )}

            {/* AI Explanation */}
            {lastAIExplanation && (
              <div className="analysis-section">
                <div className="section-label"><Icon name="coach" size={16} /> AI Move Explanation</div>
                <div className="ai-explanation-box">
                  {lastAIExplanation}
                </div>
              </div>
            )}

            {/* Suggested Moves */}
            {coachAnalyzing && !aiThinking && this.isPlayerTurn() && (
              <div className="analysis-section">
                <div className="section-label"><Icon name="hint" size={16} /> Recommended Moves</div>
                <div className="analysis-pending" role="status">Analyzing…</div>
              </div>
            )}
            {suggestedMoves.length > 0 && !aiThinking && this.isPlayerTurn() && (
              <div className="analysis-section">
                <div className="section-label"><Icon name="hint" size={16} /> Recommended Moves</div>
                <div className="suggested-moves-list">
                  {suggestedMoves.map((item, index) => (
                    <div
                      key={index}
                      className={`suggestion ${index === 0 ? "best" : ""}`}
                      onClick={() => this.playSuggestedMove(item.move)}
                    >
                      <div className="suggestion-move">
                        <span className="rank">#{item.rank}</span>
                        <span className="san">{item.san}</span>
                        <span className="win-prob">{Math.round(item.winProbability * 100)}%</span>
                      </div>
                      <div className="suggestion-reason">{item.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Advice */}
            {strategicAdvice && strategicAdvice.length > 0 && (
              <div className="analysis-section">
                <div className="section-label"><Icon name="brain" size={16} /> Strategic Advice / 战略建议</div>
                <div className="strategic-advice-list">
                  {strategicAdvice.map((advice, index) => (
                    <div key={index} className={`advice-item priority-${advice.priority}`}>
                      <p className="advice-cn">{advice.cn}</p>
                      <p className="advice-en">{advice.en}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when no analysis yet */}
            {!analysis && !lastAIExplanation && suggestedMoves.length === 0 && !coachAnalyzing && (
              <div className="analysis-empty">
                开始下棋查看AI分析和建议
                <br />
                Start playing to see AI analysis and recommendations
              </div>
            )}
          </div>
        )}

        {/* Right Panel - Tutorial Mode */}
        {gameMode === "tutorial" && currentTutorialLesson && (
          <div className="tutorial-panel-right">
            <div className="panel-title"><Icon name="graduate" size={16} /> Chess Tutorial</div>

            {/* Progress */}
            <div className="tutorial-progress">
              <div className="progress-text">
                Lesson {currentLesson + 1} / {TUTORIAL_LESSONS.length}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${((currentLesson + 1) / TUTORIAL_LESSONS.length) * 100}%` }}
                />
              </div>
              <div className="completed-text">
                ✓ {tutorialProgress.length} completed
              </div>
            </div>

            {/* Lesson Content */}
            <div className="tutorial-lesson">
              <h3 className="lesson-title">{currentTutorialLesson.title}</h3>
              <p className="lesson-title-en">{currentTutorialLesson.titleEn}</p>

              <div className="lesson-description">
                <p>{currentTutorialLesson.description}</p>
                <p className="lesson-desc-en">{currentTutorialLesson.descriptionEn}</p>
              </div>

              <div className="lesson-objective">
                <strong><Icon name="target" size={16} /> 目标 / Objective:</strong>
                <p>{currentTutorialLesson.objective}</p>
                <p className="objective-en">{currentTutorialLesson.objectiveEn}</p>
              </div>

              {/* Hint */}
              <div className="lesson-hint-section">
                <button
                  className="hint-toggle-btn"
                  onClick={this.toggleTutorialHint}
                >
                  {showTutorialHint ? <><Icon name="eye" size={16} /> Hide Hint</> : <><Icon name="hint" size={16} /> Show Hint</>}
                </button>
                {showTutorialHint && (
                  <div className="lesson-hint">
                    <p>{currentTutorialLesson.hint}</p>
                    <p className="hint-en">{currentTutorialLesson.hintEn}</p>
                  </div>
                )}
              </div>

              {/* Lesson Complete */}
              {lessonComplete && (
                <div className="lesson-complete">
                  <div className="complete-icon"><Icon name="sparkles" size={16} /></div>
                  <p>恭喜！你完成了这个课程！</p>
                  <p>Congratulations! You completed this lesson!</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="tutorial-nav">
              <button
                className="btn btn-secondary"
                onClick={this.prevLesson}
                disabled={currentLesson === 0}
              >
                ← Previous
              </button>
              <button
                className="btn btn-primary"
                onClick={() => this.startTutorial(currentLesson)}
              >
                <Icon name="reset" size={16} /> Retry
              </button>
              <button
                className="btn btn-primary"
                onClick={this.nextLesson}
                disabled={currentLesson >= TUTORIAL_LESSONS.length - 1}
              >
                Next →
              </button>
            </div>

            {/* Lesson List */}
            <div className="tutorial-lessons-list">
              <div className="section-label">All Lessons</div>
              <div className="lessons-grid">
                {TUTORIAL_LESSONS.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    className={`lesson-item ${currentLesson === index ? 'active' : ''} ${tutorialProgress.includes(lesson.id) ? 'completed' : ''}`}
                    onClick={() => this.startTutorial(index)}
                  >
                    <span className="lesson-num">{index + 1}</span>
                    {tutorialProgress.includes(lesson.id) && <span className="check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Retrospect Mode */}
        {showRetrospect && !showPatternLibrary && (
          <div className="retrospect-panel-right">
            <div className="panel-title"><Icon name="trend" size={16} /> Game Analysis / 复盘分析</div>

            {/* Win Probability Timeline */}
            <div className="retrospect-section">
              <div className="section-label">Win Probability Timeline / 胜率曲线</div>
              <div className="win-prob-timeline">
                <div className="timeline-graph">
                  {evaluations.map((eval_, index) => {
                    const height = eval_.winProbability * 100;
                    const isCurrentMove = index === retrospectMoveIndex + 1;
                    const isCritical = criticalMoments.some(m => m.moveIndex === index - 1);
                    return (
                      <div
                        key={index}
                        className={`timeline-bar ${isCurrentMove ? 'current' : ''} ${isCritical ? 'critical' : ''}`}
                        style={{ height: `${height}%` }}
                        onClick={() => this.goToMove(index - 1)}
                        title={`Move ${index}: ${Math.round(eval_.winProbability * 100)}% white`}
                      />
                    );
                  })}
                </div>
                <div className="timeline-labels">
                  <span>White</span>
                  <span>Black</span>
                </div>
              </div>
            </div>

            {/* Move Navigation */}
            <div className="retrospect-section">
              <div className="section-label">Navigation / 导航</div>
              <div className="retrospect-nav">
                <button
                  className="btn btn-sm"
                  onClick={() => this.goToMove(-1)}
                  disabled={retrospectMoveIndex === -1}
                >
                  ⏮ Start
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => this.goToMove(retrospectMoveIndex - 1)}
                  disabled={retrospectMoveIndex <= -1}
                >
                  ◀ Prev
                </button>
                <span className="move-counter">
                  {retrospectMoveIndex + 1} / {history.length}
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => this.goToMove(retrospectMoveIndex + 1)}
                  disabled={retrospectMoveIndex >= history.length - 1}
                >
                  Next ▶
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => this.goToMove(history.length - 1)}
                  disabled={retrospectMoveIndex === history.length - 1}
                >
                  End ⏭
                </button>
              </div>
              <div className="critical-nav">
                <button
                  className="btn btn-sm btn-critical"
                  onClick={this.prevCriticalMoment}
                  disabled={!criticalMoments.some(m => m.moveIndex < retrospectMoveIndex)}
                >
                  ◀ Prev Critical
                </button>
                <button
                  className="btn btn-sm btn-critical"
                  onClick={this.nextCriticalMoment}
                  disabled={!criticalMoments.some(m => m.moveIndex > retrospectMoveIndex)}
                >
                  Next Critical ▶
                </button>
              </div>
            </div>

            {/* Current Move Info */}
            {retrospectMoveIndex >= 0 && retrospectMoveIndex < history.length && (
              <div className="retrospect-section">
                <div className="section-label">Current Move / 当前着法</div>
                <div className="current-move-info">
                  <span className="move-san">
                    {Math.floor(retrospectMoveIndex / 2) + 1}.
                    {retrospectMoveIndex % 2 === 1 ? '..' : ''}
                    {history[retrospectMoveIndex].san}
                  </span>
                  {evaluations[retrospectMoveIndex + 1] && (
                    <span className="move-eval">
                      {Math.round(evaluations[retrospectMoveIndex + 1].winProbability * 100)}% White
                    </span>
                  )}
                </div>
                {/* Show if this is a critical moment */}
                {criticalMoments.find(m => m.moveIndex === retrospectMoveIndex) && (
                  <div className="critical-moment-badge">
                    <span style={{ color: criticalMoments.find(m => m.moveIndex === retrospectMoveIndex).classification.color }}>
                      {criticalMoments.find(m => m.moveIndex === retrospectMoveIndex).classification.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Best Move Comparison */}
            {retrospectMoveIndex >= 0 && (
              <div className="retrospect-section">
                <div className="section-label"><Icon name="target" size={16} /> Best Move Analysis / 最佳着法分析</div>
                {retrospectAnalyzing ? (
                  <div className="analyzing-indicator">
                    Analyzing... / 分析中...
                  </div>
                ) : retrospectBestMove ? (
                  <div className="best-move-comparison">
                    <div className="move-comparison-row">
                      <div className="comparison-item played">
                        <div className="comparison-label">You Played / 你走的</div>
                        <div className="comparison-move">{retrospectBestMove.actualMove}</div>
                      </div>
                      <div className="comparison-vs">vs</div>
                      <div className="comparison-item best">
                        <div className="comparison-label">Best Move / 最佳</div>
                        <div className="comparison-move">{retrospectBestMove.san}</div>
                      </div>
                    </div>
                    {retrospectBestMove.wasBestMove ? (
                      <div className="best-move-result correct">
                        ✓ 你走出了最佳着法！
                        <br />
                        You played the best move!
                      </div>
                    ) : (
                      <div className="best-move-result incorrect">
                        <div className="better-move-info">
                          <span className="better-label">Better: </span>
                          <span className="better-san">{retrospectBestMove.san}</span>
                          <span className="better-prob">
                            ({Math.round(retrospectBestMove.winProb * 100)}% win)
                          </span>
                        </div>
                        {retrospectBestMove.scoreDiff > 50 && (
                          <div className="score-loss">
                            Lost ~{Math.round(retrospectBestMove.scoreDiff / 100 * 10) / 10} pawns value
                            <br />
                            损失约 {Math.round(retrospectBestMove.scoreDiff / 100 * 10) / 10} 个兵的价值
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-analysis">
                    Unable to analyze this position
                  </div>
                )}
              </div>
            )}

            {/* Critical Moments List */}
            <div className="retrospect-section">
              <div className="section-label">
                Critical Moments / 关键时刻 ({criticalMoments.length})
              </div>
              <div className="critical-moments-list">
                {criticalMoments.length === 0 ? (
                  <div className="no-critical">
                    No significant turning points found.
                    <br />
                    没有发现显著的转折点。
                  </div>
                ) : (
                  criticalMoments.slice(0, 8).map((moment, index) => (
                    <div
                      key={index}
                      className={`critical-moment-item ${moment.moveIndex === retrospectMoveIndex ? 'active' : ''}`}
                      onClick={() => this.goToMove(moment.moveIndex)}
                    >
                      <div className="moment-header">
                        <span className="moment-move">
                          {Math.floor(moment.moveIndex / 2) + 1}.
                          {moment.moveIndex % 2 === 1 ? '..' : ''} {moment.moveSan}
                        </span>
                        <span
                          className="moment-classification"
                          style={{ color: moment.classification.color }}
                        >
                          {moment.classification.label}
                        </span>
                      </div>
                      <div className="moment-change">
                        {moment.change > 0 ? '↑' : '↓'}
                        {Math.round(Math.abs(moment.change) * 100)}%
                        {moment.isTurningPoint && <> <Icon name="zap" size={14} /> Turning Point</>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Learning Tips */}
            {learningTips.length > 0 && (
              <div className="retrospect-section">
                <div className="section-label"><Icon name="hint" size={16} /> Learning Tips / 学习建议</div>
                <div className="learning-tips-list">
                  {learningTips.map((tip, index) => (
                    <div key={index} className={`learning-tip priority-${tip.priority}`}>
                      <p className="tip-cn">{tip.cn}</p>
                      <p className="tip-en">{tip.en}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Panel - Pattern Library */}
        {showRetrospect && showPatternLibrary && (
          <div className="retrospect-panel-right pattern-library">
            <div className="panel-title"><Icon name="learn" size={16} /> Pattern Library / 棋型库</div>

            <div className="pattern-intro">
              <p>学习这些常见模式可以提升你的棋艺</p>
              <p>Learn these common patterns to improve your game</p>
            </div>

            <div className="patterns-list">
              {COMMON_PATTERNS_LIBRARY.map((pattern, index) => (
                <div key={index} className={`pattern-card category-${pattern.category}`}>
                  <div className="pattern-header">
                    <span className="pattern-name">{pattern.name}</span>
                    <span className="pattern-category">{pattern.category}</span>
                  </div>
                  <div className="pattern-description">
                    <p>{pattern.descriptionCn || pattern.description}</p>
                    <p className="desc-en">{pattern.descriptionEn || pattern.description}</p>
                  </div>
                  {pattern.example && (
                    <div className="pattern-example">
                      <strong>Example:</strong> {pattern.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default ChessGame;
