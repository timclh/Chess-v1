import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";
import { findBestMove, getTopMoves, analyzePosition, explainAIMove, clearCache } from "./ChessAI";
import { saveGameResult } from "./GameHistory";

class ChessGame extends Component {
  state = {
    fen: "start",
    history: [],
    squareStyles: {},
    pieceSquare: "",
    gameOver: false,
    gameStatus: "White to move",
    gameMode: "ai", // "human", "ai", or "coach"
    playerColor: "w",
    aiThinking: false,
    aiDifficulty: 2, // Default to Medium
    // Coach mode state
    analysis: null,
    suggestedMoves: [],
    showHints: true,
    lastAIExplanation: "",
    // Player tracking
    playerName: localStorage.getItem('chess_player_name') || "",
    gameStartTime: null,
    gameSaved: false,
  };

  game = null;

  componentDidMount() {
    this.game = new Chess();
    this.setState({ gameStartTime: Date.now() });
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

    this.setState({ analysis, suggestedMoves });

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

  saveGame = (result) => {
    if (this.state.gameSaved || !this.state.playerName) return;

    const duration = this.state.gameStartTime
      ? Math.round((Date.now() - this.state.gameStartTime) / 1000)
      : 0;

    saveGameResult({
      playerName: this.state.playerName,
      playerColor: this.state.playerColor,
      opponent: this.state.gameMode,
      difficulty: this.state.aiDifficulty,
      result: result,
      moves: this.state.history.length,
      duration: duration,
    });

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
    if (this.state.gameMode === "human") return true;
    return this.game && this.game.turn() === this.state.playerColor;
  };

  onSquareClick = (square) => {
    if (!this.game || this.state.gameOver || this.state.aiThinking) return;
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
    if (!this.game || this.state.gameOver || this.state.aiThinking) return;
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

  setGameMode = (mode) => {
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
      analysis, suggestedMoves, showHints, lastAIExplanation
    } = this.state;

    const boardOrientation = (gameMode === "ai" || gameMode === "coach") && playerColor === "b" ? "black" : "white";

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
              draggable={!aiThinking && !gameOver}
            />
          </div>

          {/* Move History under board */}
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

            {/* Empty state when no analysis yet */}
            {!analysis && !lastAIExplanation && suggestedMoves.length === 0 && (
              <div className="analysis-empty">
                Start playing to see AI analysis and recommendations
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default ChessGame;
