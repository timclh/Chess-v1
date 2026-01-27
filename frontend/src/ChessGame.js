import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";
import { findBestMove, getTopMoves, analyzePosition, explainAIMove, getStrategicAdvice, clearCache } from "./ChessAI";
import { saveGameResult, saveGameState, loadGameState, hasSavedGame, deleteSavedGame } from "./GameHistory";

// Tutorial lessons for beginners
const TUTORIAL_LESSONS = [
  {
    id: 1,
    title: "棋子移动: 兵 (Pawn)",
    titleEn: "Piece Movement: Pawn",
    description: "兵只能向前移动一格，但捕获时需要斜向移动。第一次移动可以走两格。",
    descriptionEn: "Pawns move forward one square, but capture diagonally. On first move, they can advance two squares.",
    fen: "8/8/8/8/8/8/4P3/8 w - - 0 1",
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
    fen: "8/8/8/8/8/8/8/R7 w - - 0 1",
    objective: "将车移动到a8",
    objectiveEn: "Move the rook to a8",
    correctMove: "Ra8",
    hint: "车可以沿直线移动整个棋盘",
    hintEn: "Rooks can move in straight lines across the entire board",
  },
  {
    id: 3,
    title: "棋子移动: 象 (Bishop)",
    titleEn: "Piece Movement: Bishop",
    description: "象只能斜向移动任意格数。",
    descriptionEn: "Bishops move diagonally any number of squares.",
    fen: "8/8/8/8/8/8/8/2B5 w - - 0 1",
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
    fen: "8/8/8/8/8/8/8/1N6 w - - 0 1",
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
    fen: "8/8/8/8/3Q4/8/8/8 w - - 0 1",
    objective: "将后移动到h8",
    objectiveEn: "Move the queen to h8",
    correctMove: "Qh8",
    hint: "后可以像车和象一样移动",
    hintEn: "The Queen combines the moves of a rook and bishop",
  },
  {
    id: 6,
    title: "棋子移动: 王 (King)",
    titleEn: "Piece Movement: King",
    description: "王每次只能移动一格，但可以向任何方向移动。保护好你的王！",
    descriptionEn: "The King moves one square in any direction. Protect your King at all costs!",
    fen: "8/8/8/8/4K3/8/8/8 w - - 0 1",
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
    description: "当王被攻击时，这叫做"将军"。你必须立即解除将军。",
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
    fen: "8/8/8/3p4/4N3/8/8/8 w - - 0 1",
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
    gameMode: "ai", // "human", "ai", "coach", or "tutorial"
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
    // Save/Load state
    hasSavedGame: false,
    showSaveNotification: false,
    // Tutorial mode state
    currentLesson: 0,
    lessonComplete: false,
    showTutorialHint: false,
    tutorialProgress: JSON.parse(localStorage.getItem('chess_tutorial_progress') || '[]'),
  };

  game = null;

  componentDidMount() {
    this.game = new Chess();
    this.setState({
      gameStartTime: Date.now(),
      hasSavedGame: hasSavedGame(),
    });
    this.updateGameStatus();
    this.updateAnalysis();
  }

  componentWillUnmount() {
    this.game = null;
  }

  updateAnalysis = () => {
    if (!this.game || this.state.gameMode !== "coach") return;

    const analysis = analyzePosition(this.game);
    // Use selected difficulty for suggestions (balances speed vs quality)
    const depth = this.state.aiDifficulty;
    const suggestedMoves = getTopMoves(this.game, 3, depth);
    const strategicAdvice = getStrategicAdvice(this.game);

    this.setState({ analysis, suggestedMoves, strategicAdvice });

    // Highlight suggested move squares
    if (this.state.showHints && suggestedMoves.length > 0) {
      const bestMove = suggestedMoves[0].move;
      this.highlightSuggestedMove(bestMove.from, bestMove.to);
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
        if (this.state.gameMode === "human") {
          gameResult = "draw"; // In human mode, we don't track specific winner
        } else {
          gameResult = winnerColor === this.state.playerColor ? "win" : "loss";
        }
      } else if (this.game.in_stalemate()) {
        status = "Draw by stalemate";
      } else if (this.game.in_threefold_repetition()) {
        status = "Draw by repetition";
      } else if (this.game.insufficient_material()) {
        status = "Draw by insufficient material";
      } else if (this.game.in_draw()) {
        status = "Draw";
      }

      this.setState({ gameOver: true, gameStatus: status }, () => {
        this.saveGame(gameResult);
      });
    } else {
      if (this.game.in_check()) {
        status = `${turn} is in check!`;
      } else {
        status = `${turn} to move`;
      }
      this.setState({ gameOver: false, gameStatus: status });
    }
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

  makeAIMove = () => {
    if (!this.game || this.state.gameOver) return;
    if (this.game.turn() === this.state.playerColor) return;

    this.setState({ aiThinking: true });

    setTimeout(() => {
      const bestMove = findBestMove(this.game, this.state.aiDifficulty);
      if (bestMove && this.game) {
        // Get explanation before making the move (for coach mode)
        let explanation = "";
        if (this.state.gameMode === "coach") {
          explanation = explainAIMove(this.game, bestMove);
        }

        this.game.move(bestMove);
        this.setState({
          fen: this.game.fen(),
          history: this.game.history({ verbose: true }),
          aiThinking: false,
          lastAIExplanation: explanation,
        });
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

  isPlayerTurn = () => {
    if (this.state.gameMode === "human" || this.state.gameMode === "tutorial") return true;
    return this.game && this.game.turn() === this.state.playerColor;
  };

  onSquareClick = (square) => {
    if (!this.game || this.state.aiThinking) return;
    if (this.state.gameOver && this.state.gameMode !== "tutorial") return;
    if (this.state.gameMode === "tutorial" && this.state.lessonComplete) return;
    if (!this.isPlayerTurn()) return;

    this.setState(({ pieceSquare }) => {
      if (pieceSquare === square) {
        this.removeHighlightSquare();
        if (this.state.gameMode === "coach") {
          this.updateAnalysis();
        }
        return { pieceSquare: "" };
      }

      if (pieceSquare) {
        const move = this.game.move({
          from: pieceSquare,
          to: square,
          promotion: "q",
        });

        if (move !== null) {
          this.removeHighlightSquare();

          // Handle tutorial mode
          if (this.state.gameMode === "tutorial") {
            this.checkTutorialMove(move);
            return {
              fen: this.game.fen(),
              pieceSquare: "",
            };
          }

          this.updateGameStatus();

          const newState = {
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
            pieceSquare: "",
            lastAIExplanation: "",
          };

          if (this.state.gameMode === "ai" || this.state.gameMode === "coach") {
            setTimeout(() => {
              this.makeAIMove();
            }, 300);
          }

          if (this.state.gameMode === "coach") {
            setTimeout(() => this.updateAnalysis(), 100);
          }

          return newState;
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
        return { pieceSquare: square };
      }

      return { pieceSquare: "" };
    });
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
    this.updateGameStatus();

    if (this.state.gameMode === "ai" || this.state.gameMode === "coach") {
      setTimeout(() => this.makeAIMove(), 300);
    }

    if (this.state.gameMode === "coach") {
      setTimeout(() => this.updateAnalysis(), 100);
    }
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
        this.updateAnalysis();
      } else {
        this.removeHighlightSquare();
      }
    }
  };

  resetGame = () => {
    if (!this.game) return;
    this.game.reset();
    clearCache(); // Clear AI cache for new game
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
      gameStartTime: Date.now(),
      gameSaved: false,
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

    if ((this.state.gameMode === "ai" || this.state.gameMode === "coach") && this.state.history.length >= 2) {
      this.game.undo();
      this.game.undo();
    } else {
      this.game.undo();
    }

    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      squareStyles: {},
      pieceSquare: "",
      lastAIExplanation: "",
    });
    this.updateGameStatus();

    if (this.state.gameMode === "coach") {
      setTimeout(() => this.updateAnalysis(), 100);
    }
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

    this.game.move(move.san);
    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      pieceSquare: "",
      lastAIExplanation: "",
    });
    this.updateGameStatus();

    if (this.state.gameMode === "coach") {
      setTimeout(() => this.makeAIMove(), 300);
    }
  };

  render() {
    const {
      fen, squareStyles, gameStatus, gameOver, history,
      gameMode, playerColor, aiThinking, aiDifficulty,
      analysis, suggestedMoves, strategicAdvice, showHints, lastAIExplanation,
      hasSavedGame, showSaveNotification,
      currentLesson, lessonComplete, showTutorialHint, tutorialProgress
    } = this.state;

    const boardOrientation = (gameMode === "ai" || gameMode === "coach") && playerColor === "b" ? "black" : "white";
    const currentTutorialLesson = TUTORIAL_LESSONS[currentLesson];

    return (
      <div className="chess-game-layout">
        {/* Left Panel - Settings */}
        <div className="settings-panel">
          <div className="panel-title">Game Settings</div>

          {/* Player Name */}
          <div className="settings-section">
            <div className="section-label">Player Name</div>
            <input
              type="text"
              className="player-name-input"
              placeholder="Enter your name"
              value={this.state.playerName}
              onChange={(e) => this.setPlayerName(e.target.value)}
            />
          </div>

          {/* Game Mode Selector */}
          <div className="settings-section">
            <div className="section-label">Game Mode</div>
            <div className="mode-selector-vertical">
              <button
                className={`mode-btn ${gameMode === "human" ? "active" : ""}`}
                onClick={() => this.setGameMode("human")}
              >
                👥 vs Human
              </button>
              <button
                className={`mode-btn ${gameMode === "ai" ? "active" : ""}`}
                onClick={() => this.setGameMode("ai")}
              >
                🤖 vs AI
              </button>
              <button
                className={`mode-btn ${gameMode === "coach" ? "active" : ""}`}
                onClick={() => this.setGameMode("coach")}
              >
                📚 Coach
              </button>
              <button
                className={`mode-btn tutorial-btn ${gameMode === "tutorial" ? "active" : ""}`}
                onClick={() => this.setGameMode("tutorial")}
              >
                🎓 Tutorial
              </button>
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

          {/* Game Controls in Settings */}
          {gameMode !== "tutorial" && (
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
                💾 Save Game
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
                    🗑️ Delete Save
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
          {/* Game Status */}
          <div className={`game-status ${gameOver ? "game-over" : ""} ${aiThinking ? "thinking" : ""}`}>
            {aiThinking ? "🤔 AI is thinking..." : gameStatus}
          </div>

          {/* Chess Board */}
          <div className="board-container">
            <Chessboard
              id="chessboard"
              position={fen}
              width={520}
              orientation={boardOrientation}
              onDrop={this.onDrop}
              onSquareClick={this.onSquareClick}
              onMouseOverSquare={this.onMouseOverSquare}
              onMouseOutSquare={this.onMouseOutSquare}
              squareStyles={squareStyles}
              boardStyle={{
                borderRadius: "8px",
                boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)",
              }}
              lightSquareStyle={{ backgroundColor: "#f0d9b5" }}
              darkSquareStyle={{ backgroundColor: "#b58863" }}
              dropSquareStyle={{ boxShadow: "inset 0 0 1px 4px rgb(255, 255, 0)" }}
              draggable={!aiThinking && (!gameOver || gameMode === "tutorial") && !(gameMode === "tutorial" && lessonComplete)}
            />
          </div>

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
                <div className="section-label">🤖 AI Move Explanation</div>
                <div className="ai-explanation-box">
                  {lastAIExplanation}
                </div>
              </div>
            )}

            {/* Suggested Moves */}
            {suggestedMoves.length > 0 && !aiThinking && this.isPlayerTurn() && (
              <div className="analysis-section">
                <div className="section-label">💡 Recommended Moves</div>
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
                <div className="section-label">🧠 Strategic Advice / 战略建议</div>
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
            {!analysis && !lastAIExplanation && suggestedMoves.length === 0 && (
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
            <div className="panel-title">🎓 Chess Tutorial</div>

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
                <strong>🎯 目标 / Objective:</strong>
                <p>{currentTutorialLesson.objective}</p>
                <p className="objective-en">{currentTutorialLesson.objectiveEn}</p>
              </div>

              {/* Hint */}
              <div className="lesson-hint-section">
                <button
                  className="hint-toggle-btn"
                  onClick={this.toggleTutorialHint}
                >
                  {showTutorialHint ? "🙈 Hide Hint" : "💡 Show Hint"}
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
                  <div className="complete-icon">🎉</div>
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
                🔄 Retry
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
      </div>
    );
  }
}

export default ChessGame;
