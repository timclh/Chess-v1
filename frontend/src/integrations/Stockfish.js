import React, { Component } from "react";
import PropTypes from "prop-types";
import Chess from "chess.js";

const STOCKFISH = window.STOCKFISH;

class Stockfish extends Component {
  static propTypes = {
    children: PropTypes.func,
  };

  state = {
    fen: "start",
  };

  // Instance-level game state instead of global
  game = null;
  engine = null;
  evaler = null;
  gameOverIntervalId = null;
  clockTimeoutId = null;
  announced_game_over = false;

  componentDidMount() {
    // Initialize game instance per component
    this.game = new Chess();

    this.setState({
      fen: this.game.fen(),
    });

    this.initEngine();
    this.prepareMove();
  }

  componentWillUnmount() {
    // Clean up interval
    if (this.gameOverIntervalId) {
      clearInterval(this.gameOverIntervalId);
      this.gameOverIntervalId = null;
    }

    // Clean up clock timeout
    if (this.clockTimeoutId) {
      clearTimeout(this.clockTimeoutId);
      this.clockTimeoutId = null;
    }

    // Terminate workers
    if (this.engine) {
      try {
        this.engine.terminate();
      } catch (e) {
        // Worker may not support terminate
      }
      this.engine = null;
    }

    if (this.evaler) {
      try {
        this.evaler.terminate();
      } catch (e) {
        // Worker may not support terminate
      }
      this.evaler = null;
    }
  }

  initEngine = (options = {}) => {
    // Create workers and store references for cleanup
    this.engine =
      typeof STOCKFISH === "function"
        ? STOCKFISH()
        : new Worker(options.stockfishjs || "stockfish.js");

    this.evaler =
      typeof STOCKFISH === "function"
        ? STOCKFISH()
        : new Worker(options.stockfishjs || "stockfish.js");

    this.engineStatus = {};
    this.time = {
      wtime: 3000,
      btime: 3000,
      winc: 1500,
      binc: 1500,
    };
    this.playerColor = "black";

    // Store interval ID for cleanup
    this.gameOverIntervalId = setInterval(() => {
      if (this.announced_game_over) {
        return;
      }
      if (this.game && this.game.game_over()) {
        this.announced_game_over = true;
        // Clear interval once game is over
        if (this.gameOverIntervalId) {
          clearInterval(this.gameOverIntervalId);
          this.gameOverIntervalId = null;
        }
      }
    }, 500);

    // Initialize UCI
    this.uciCmd("uci");

    // Set up message handlers
    this.evaler.onmessage = this.handleEvalerMessage;
    this.engine.onmessage = this.handleEngineMessage;
  };

  uciCmd = (cmd, which) => {
    (which || this.engine).postMessage(cmd);
  };

  handleEvalerMessage = (event) => {
    let line;
    if (event && typeof event === "object") {
      line = event.data;
    } else {
      line = event;
    }

    // Ignore some output
    if (
      line === "uciok" ||
      line === "readyok" ||
      (typeof line === "string" && line.substr(0, 11) === "option name")
    ) {
      return;
    }
  };

  handleEngineMessage = (event) => {
    let line;
    if (event && typeof event === "object") {
      line = event.data;
    } else {
      line = event;
    }

    if (line === "uciok") {
      this.engineStatus.engineLoaded = true;
    } else if (line === "readyok") {
      this.engineStatus.engineReady = true;
    } else {
      let match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
      // Did the AI move?
      if (match) {
        this.game.move({
          from: match[1],
          to: match[2],
          promotion: match[3],
        });
        this.setState({
          fen: this.game.fen(),
        });
        this.prepareMove();
        this.uciCmd("eval", this.evaler);
      } else if ((match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/))) {
        this.engineStatus.search = "Depth: " + match[1] + " Nps: " + match[2];
      }

      // Is it sending feedback with a score?
      if ((match = line.match(/^info .*\bscore (\w+) (-?\d+)/))) {
        let score = parseInt(match[2], 10) * (this.game.turn() === "w" ? 1 : -1);
        // Is it measuring in centipawns?
        if (match[1] === "cp") {
          this.engineStatus.score = (score / 100.0).toFixed(2);
        } else if (match[1] === "mate") {
          this.engineStatus.score = "Mate in " + Math.abs(score);
        }

        // Is the score bounded?
        if ((match = line.match(/\b(upper|lower)bound\b/))) {
          this.engineStatus.score =
            ((match[1] === "upper") === (this.game.turn() === "w")
              ? "<= "
              : ">= ") + this.engineStatus.score;
        }
      }
    }
  };

  clockTick = () => {
    let t =
      (this.time.clockColor === "white" ? this.time.wtime : this.time.btime) +
      this.time.startTime -
      Date.now();
    let timeToNextSecond = (t % 1000) + 1;
    this.clockTimeoutId = setTimeout(this.clockTick, timeToNextSecond);
  };

  stopClock = () => {
    if (this.clockTimeoutId !== null) {
      clearTimeout(this.clockTimeoutId);
      this.clockTimeoutId = null;
    }
    if (this.time && this.time.startTime > 0) {
      let elapsed = Date.now() - this.time.startTime;
      this.time.startTime = null;
      if (this.time.clockColor === "white") {
        this.time.wtime = Math.max(0, this.time.wtime - elapsed);
      } else {
        this.time.btime = Math.max(0, this.time.btime - elapsed);
      }
    }
  };

  startClock = () => {
    if (this.game.turn() === "w") {
      this.time.wtime += this.time.winc;
      this.time.clockColor = "white";
    } else {
      this.time.btime += this.time.binc;
      this.time.clockColor = "black";
    }
    this.time.startTime = Date.now();
    this.clockTick();
  };

  getMoves = () => {
    let moves = "";
    let history = this.game.history({ verbose: true });

    for (let i = 0; i < history.length; ++i) {
      let move = history[i];
      moves += " " + move.from + move.to + (move.promotion ? move.promotion : "");
    }

    return moves;
  };

  prepareMove = () => {
    if (!this.game || !this.engine) return;

    this.stopClock();
    let turn = this.game.turn() === "w" ? "white" : "black";

    if (!this.game.game_over()) {
      if (turn !== this.playerColor) {
        this.uciCmd("position startpos moves" + this.getMoves());
        this.uciCmd("position startpos moves" + this.getMoves(), this.evaler);
        this.uciCmd("eval", this.evaler);

        if (this.time && this.time.wtime) {
          this.uciCmd(
            "go " +
              (this.time.depth ? "depth " + this.time.depth : "") +
              " wtime " +
              this.time.wtime +
              " winc " +
              this.time.winc +
              " btime " +
              this.time.btime +
              " binc " +
              this.time.binc
          );
        } else {
          this.uciCmd("go " + (this.time.depth ? "depth " + this.time.depth : ""));
        }
      }
      if (this.game.history().length >= 2 && !this.time.depth && !this.time.nodes) {
        this.startClock();
      }
    }
  };

  onDrop = ({ sourceSquare, targetSquare }) => {
    if (!this.game) return;

    // See if the move is legal
    const move = this.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    // Illegal move
    if (move === null) return;

    return new Promise((resolve) => {
      this.setState({
        fen: this.game.fen(),
      });
      resolve();
    }).then(() => this.prepareMove());
  };

  startNewGame = () => {
    this.uciCmd("ucinewgame");
    this.uciCmd("isready");
    this.engineStatus.engineReady = false;
    this.engineStatus.search = null;
    this.prepareMove();
    this.announced_game_over = false;
  };

  render() {
    const { fen } = this.state;
    return this.props.children({
      position: fen,
      onDrop: this.onDrop,
    });
  }
}

export default Stockfish;
