import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";

class ChessGame extends Component {
  state = {
    fen: "start",
    history: [],
    squareStyles: {},
    pieceSquare: "",
    gameOver: false,
    gameStatus: "White to move",
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

    // Highlight source square differently
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

  onSquareClick = (square) => {
    if (!this.game || this.state.gameOver) return;

    this.setState(({ pieceSquare }) => {
      // If clicking the same square, deselect
      if (pieceSquare === square) {
        this.removeHighlightSquare();
        return { pieceSquare: "" };
      }

      // Try to make a move if a piece was selected
      if (pieceSquare) {
        const move = this.game.move({
          from: pieceSquare,
          to: square,
          promotion: "q", // Always promote to queen for simplicity
        });

        // If move is valid
        if (move !== null) {
          this.removeHighlightSquare();
          this.updateGameStatus();
          return {
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
            pieceSquare: "",
          };
        }
      }

      // Select a new piece (if it's the current player's piece)
      const piece = this.game.get(square);
      if (piece && piece.color === this.game.turn()) {
        // Get possible moves for this piece
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
    if (!this.game || this.state.gameOver) return;

    // Check if it's the correct player's turn
    const piece = this.game.get(sourceSquare);
    if (!piece || piece.color !== this.game.turn()) {
      return;
    }

    const move = this.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    // Illegal move
    if (move === null) return;

    this.removeHighlightSquare();
    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      pieceSquare: "",
    });
    this.updateGameStatus();
  };

  onMouseOverSquare = (square) => {
    if (!this.game || this.state.gameOver) return;

    // Get piece on this square
    const piece = this.game.get(square);
    if (!piece || piece.color !== this.game.turn()) return;

    // Get possible moves for this square
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
    });
    this.updateGameStatus();
  };

  undoMove = () => {
    if (!this.game || this.state.history.length === 0) return;
    this.game.undo();
    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      squareStyles: {},
      pieceSquare: "",
    });
    this.updateGameStatus();
  };

  render() {
    const { fen, squareStyles, gameStatus, gameOver, history } = this.state;

    return (
      <div className="chess-game">
        <div className="game-info">
          <div className={`game-status ${gameOver ? "game-over" : ""}`}>
            {gameStatus}
          </div>
          <div className="game-controls">
            <button className="btn btn-primary" onClick={this.resetGame}>
              New Game
            </button>
            <button
              className="btn btn-secondary"
              onClick={this.undoMove}
              disabled={history.length === 0}
            >
              Undo
            </button>
          </div>
        </div>

        <div className="board-container">
          <Chessboard
            id="chessboard"
            position={fen}
            width={400}
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
          />
        </div>

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
