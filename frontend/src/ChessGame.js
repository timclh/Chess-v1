import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";
import { findBestMove } from "./ChessAI";

class ChessGame extends Component {
  state = {
    fen: "start",
    history: [],
    squareStyles: {},
    pieceSquare: "",
    gameOver: false,
    gameStatus: "White to move",
    gameMode: "ai", // "human" or "ai"
    playerColor: "w", // player plays white by default
    aiThinking: false,
    aiDifficulty: 3, // search depth (1-4)
  };

  game = null;

  componentDidMount() {
    this.game = new Chess();
    this.updateGameStatus();
  }

  componentWillUnmount() {
    this.game = null;
  }

  updateGameStatus = () => {
    if (!this.game) return;

    let status = "";
    const turn = this.game.turn() === "w" ? "White" : "Black";

    if (this.game.game_over()) {
      if (this.game.in_checkmate()) {
        const winner = this.game.turn() === "w" ? "Black" : "White";
        status = `Checkmate! ${winner} wins!`;
      } else if (this.game.in_stalemate()) {
        status = "Draw by stalemate";
      } else if (this.game.in_threefold_repetition()) {
        status = "Draw by repetition";
      } else if (this.game.insufficient_material()) {
        status = "Draw by insufficient material";
      } else if (this.game.in_draw()) {
        status = "Draw";
      }
      this.setState({ gameOver: true, gameStatus: status });
    } else {
      if (this.game.in_check()) {
        status = `${turn} is in check!`;
      } else {
        status = `${turn} to move`;
      }
      this.setState({ gameOver: false, gameStatus: status });
    }
  };

  makeAIMove = () => {
    if (!this.game || this.state.gameOver) return;
    if (this.game.turn() === this.state.playerColor) return;

    this.setState({ aiThinking: true });

    // Use setTimeout to allow UI to update before AI thinks
    setTimeout(() => {
      const bestMove = findBestMove(this.game, this.state.aiDifficulty);
      if (bestMove && this.game) {
        this.game.move(bestMove);
        this.setState({
          fen: this.game.fen(),
          history: this.game.history({ verbose: true }),
          aiThinking: false,
        });
        this.updateGameStatus();
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
          };

          // Trigger AI move after state update
          if (this.state.gameMode === "ai") {
            setTimeout(() => this.makeAIMove(), 300);
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
    });
    this.updateGameStatus();

    // Trigger AI move
    if (this.state.gameMode === "ai") {
      setTimeout(() => this.makeAIMove(), 300);
    }
  };

  onMouseOverSquare = (square) => {
    if (!this.game || this.state.gameOver || this.state.aiThinking) return;
    if (!this.isPlayerTurn()) return;

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
      this.removeHighlightSquare();
    }
  };

  resetGame = () => {
    if (!this.game) return;
    this.game.reset();
    this.setState({
      fen: this.game.fen(),
      history: [],
      squareStyles: {},
      pieceSquare: "",
      gameOver: false,
      aiThinking: false,
    });
    this.updateGameStatus();

    // If AI plays white, make AI move
    if (this.state.gameMode === "ai" && this.state.playerColor === "b") {
      setTimeout(() => this.makeAIMove(), 500);
    }
  };

  undoMove = () => {
    if (!this.game || this.state.history.length === 0 || this.state.aiThinking) return;

    // In AI mode, undo both player and AI move
    if (this.state.gameMode === "ai" && this.state.history.length >= 2) {
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
    });
    this.updateGameStatus();
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

  render() {
    const {
      fen, squareStyles, gameStatus, gameOver, history,
      gameMode, playerColor, aiThinking, aiDifficulty
    } = this.state;

    const boardOrientation = gameMode === "ai" && playerColor === "b" ? "black" : "white";

    return (
      <div className="chess-game">
        {/* Game Mode Selector */}
        <div className="mode-selector">
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
        </div>

        {/* AI Options */}
        {gameMode === "ai" && (
          <div className="ai-options">
            <div className="option-group">
              <label>Play as:</label>
              <div className="color-selector">
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
            <div className="option-group">
              <label>Difficulty:</label>
              <div className="difficulty-selector">
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
          </div>
        )}

        {/* Game Status */}
        <div className="game-info">
          <div className={`game-status ${gameOver ? "game-over" : ""} ${aiThinking ? "thinking" : ""}`}>
            {aiThinking ? "🤔 AI is thinking..." : gameStatus}
          </div>
          <div className="game-controls">
            <button className="btn btn-primary" onClick={this.resetGame}>
              New Game
            </button>
            <button
              className="btn btn-secondary"
              onClick={this.undoMove}
              disabled={history.length === 0 || aiThinking}
            >
              Undo
            </button>
          </div>
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

        {/* Move History */}
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
    );
  }
}

export default ChessGame;
