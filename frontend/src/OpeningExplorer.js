import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";
import { calcBoardWidth } from './boardSize';

// Opening Database with ECO codes, names, and variations
const OPENING_DATABASE = [
  // Italian Game Family
  {
    eco: "C50",
    name: "Italian Game",
    nameCn: "意大利开局",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    description: "Classic opening focusing on quick development and control of the center.",
    descriptionCn: "经典开局，注重快速出子和控制中心。",
    winRate: { white: 0.38, draw: 0.32, black: 0.30 },
    difficulty: 1,
    popularity: 95,
    keyIdeas: [
      { en: "Control d5 and f7 squares", cn: "控制d5和f7格" },
      { en: "Prepare kingside castling", cn: "准备王翼易位" },
      { en: "Develop pieces harmoniously", cn: "和谐地发展棋子" },
    ],
  },
  {
    eco: "C51",
    name: "Evans Gambit",
    nameCn: "埃文斯弃兵",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4"],
    description: "Aggressive gambit sacrificing a pawn for rapid development and attack.",
    descriptionCn: "激进的弃兵开局，牺牲一兵换取快速发展和进攻。",
    winRate: { white: 0.42, draw: 0.28, black: 0.30 },
    difficulty: 2,
    popularity: 60,
    keyIdeas: [
      { en: "Sacrifice b4 pawn for tempo", cn: "牺牲b4兵换取先手" },
      { en: "Open lines for pieces", cn: "为棋子打开线路" },
      { en: "Attack f7 weakness", cn: "进攻f7弱点" },
    ],
  },
  // Sicilian Defense Family
  {
    eco: "B20",
    name: "Sicilian Defense",
    nameCn: "西西里防御",
    moves: ["e4", "c5"],
    description: "The most popular response to 1.e4, leading to asymmetrical positions.",
    descriptionCn: "应对1.e4最流行的选择，导致不对称局面。",
    winRate: { white: 0.35, draw: 0.30, black: 0.35 },
    difficulty: 2,
    popularity: 98,
    keyIdeas: [
      { en: "Fight for d4 square", cn: "争夺d4格" },
      { en: "Create asymmetrical pawn structure", cn: "创造不对称兵型" },
      { en: "Counterattack on queenside", cn: "后翼反击" },
    ],
  },
  {
    eco: "B33",
    name: "Sicilian Najdorf",
    nameCn: "西西里纳伊道夫变例",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    description: "One of the most complex and deeply analyzed openings.",
    descriptionCn: "最复杂且研究最深的开局之一。",
    winRate: { white: 0.36, draw: 0.32, black: 0.32 },
    difficulty: 4,
    popularity: 85,
    keyIdeas: [
      { en: "Flexible pawn structure", cn: "灵活的兵型" },
      { en: "Prepare ...e5 or ...b5", cn: "准备...e5或...b5" },
      { en: "Control b5 square with ...a6", cn: "用...a6控制b5格" },
    ],
  },
  // French Defense
  {
    eco: "C00",
    name: "French Defense",
    nameCn: "法兰西防御",
    moves: ["e4", "e6"],
    description: "Solid defense preparing ...d5 to challenge the center.",
    descriptionCn: "稳固的防御，准备...d5挑战中心。",
    winRate: { white: 0.37, draw: 0.33, black: 0.30 },
    difficulty: 2,
    popularity: 75,
    keyIdeas: [
      { en: "Prepare ...d5 counter", cn: "准备...d5反击" },
      { en: "Solid pawn chain", cn: "稳固的兵链" },
      { en: "Accept slightly cramped position", cn: "接受略微拥挤的局面" },
    ],
  },
  // Queen's Gambit
  {
    eco: "D06",
    name: "Queen's Gambit",
    nameCn: "后翼弃兵",
    moves: ["d4", "d5", "c4"],
    description: "Classic opening offering a pawn to control the center.",
    descriptionCn: "经典开局，提供一兵以控制中心。",
    winRate: { white: 0.40, draw: 0.35, black: 0.25 },
    difficulty: 2,
    popularity: 90,
    keyIdeas: [
      { en: "Challenge Black's d5 pawn", cn: "挑战黑方d5兵" },
      { en: "Control central squares", cn: "控制中心格" },
      { en: "Develop pieces actively", cn: "积极发展棋子" },
    ],
  },
  {
    eco: "D30",
    name: "Queen's Gambit Declined",
    nameCn: "后翼弃兵拒绝",
    moves: ["d4", "d5", "c4", "e6"],
    description: "Solid response maintaining the d5 pawn.",
    descriptionCn: "稳固的应对，保持d5兵。",
    winRate: { white: 0.38, draw: 0.38, black: 0.24 },
    difficulty: 2,
    popularity: 80,
    keyIdeas: [
      { en: "Maintain central pawn", cn: "保持中心兵" },
      { en: "Develop bishop to e7 or b4", cn: "象出e7或b4" },
      { en: "Prepare ...c5 break", cn: "准备...c5突破" },
    ],
  },
  // London System
  {
    eco: "D02",
    name: "London System",
    nameCn: "伦敦体系",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"],
    description: "Solid system focusing on piece placement over pawn play.",
    descriptionCn: "稳固的体系，注重棋子布局而非兵的推进。",
    winRate: { white: 0.38, draw: 0.34, black: 0.28 },
    difficulty: 1,
    popularity: 70,
    keyIdeas: [
      { en: "Develop bishop before e3", cn: "在e3之前出象" },
      { en: "Build solid pawn pyramid", cn: "建立稳固的兵金字塔" },
      { en: "Simple, consistent setup", cn: "简单一致的布局" },
    ],
  },
  // King's Indian Defense
  {
    eco: "E60",
    name: "King's Indian Defense",
    nameCn: "王翼印度防御",
    moves: ["d4", "Nf6", "c4", "g6"],
    description: "Hypermodern defense allowing White to build a center, then attacking it.",
    descriptionCn: "超现代防御，允许白方建立中心，然后进攻它。",
    winRate: { white: 0.39, draw: 0.30, black: 0.31 },
    difficulty: 3,
    popularity: 75,
    keyIdeas: [
      { en: "Fianchetto kingside bishop", cn: "王翼象侧翼出击" },
      { en: "Prepare ...e5 break", cn: "准备...e5突破" },
      { en: "Attack the center later", cn: "稍后进攻中心" },
    ],
  },
  // Ruy Lopez
  {
    eco: "C60",
    name: "Ruy Lopez",
    nameCn: "西班牙开局",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    description: "One of the oldest and most respected openings in chess.",
    descriptionCn: "国际象棋中最古老和最受尊重的开局之一。",
    winRate: { white: 0.39, draw: 0.34, black: 0.27 },
    difficulty: 3,
    popularity: 92,
    keyIdeas: [
      { en: "Pressure on e5 pawn via Nc6", cn: "通过Nc6对e5兵施压" },
      { en: "Long-term positional play", cn: "长期的位置性对弈" },
      { en: "Flexible pawn structure options", cn: "灵活的兵型选择" },
    ],
  },
  // Caro-Kann
  {
    eco: "B10",
    name: "Caro-Kann Defense",
    nameCn: "卡罗-卡恩防御",
    moves: ["e4", "c6"],
    description: "Solid defense preparing ...d5 with pawn support.",
    descriptionCn: "稳固的防御，准备有兵支持的...d5。",
    winRate: { white: 0.36, draw: 0.35, black: 0.29 },
    difficulty: 2,
    popularity: 70,
    keyIdeas: [
      { en: "Support ...d5 with c6", cn: "用c6支持...d5" },
      { en: "Develop light-squared bishop", cn: "发展浅色格象" },
      { en: "Solid, less cramped than French", cn: "稳固，比法兰西更宽敞" },
    ],
  },
  // Scotch Game
  {
    eco: "C45",
    name: "Scotch Game",
    nameCn: "苏格兰开局",
    moves: ["e4", "e5", "Nf3", "Nc6", "d4"],
    description: "Direct approach opening the center immediately.",
    descriptionCn: "直接的方法，立即打开中心。",
    winRate: { white: 0.40, draw: 0.32, black: 0.28 },
    difficulty: 2,
    popularity: 65,
    keyIdeas: [
      { en: "Open the center early", cn: "尽早打开中心" },
      { en: "Avoid theoretical lines of Ruy Lopez", cn: "避开西班牙开局的理论变例" },
      { en: "Active piece play", cn: "积极的棋子对弈" },
    ],
  },
];

// Training puzzles for openings
const OPENING_TRAINING = {
  "Italian Game": [
    { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3", correctMove: "Bc5", hint: "Develop the bishop actively" },
    { fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", correctMove: "c3", hint: "Prepare d4 push" },
  ],
  "Sicilian Defense": [
    { fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", correctMove: "Nf3", hint: "Develop knight, prepare d4" },
    { fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", correctMove: "d6", hint: "Prepare ...Nf6 and ...e5" },
  ],
  "Queen's Gambit": [
    { fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2", correctMove: "e6", hint: "Decline the gambit, support d5" },
    { fen: "rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3", correctMove: "Nc3", hint: "Develop and add pressure to d5" },
  ],
};

class OpeningExplorer extends Component {
  state = {
    // Current position
    fen: "start",
    moveHistory: [],
    currentOpening: null,
    matchingOpenings: [],

    // UI state
    viewMode: "explore", // 'explore' | 'train' | 'repertoire'
    selectedOpening: null,
    expandedOpening: null,
    filterDifficulty: null,
    searchQuery: "",

    // Training state
    trainingOpening: null,
    trainingStep: 0,
    trainingCorrect: 0,
    trainingWrong: 0,
    showTrainingHint: false,
    trainingFeedback: null,

    // Repertoire (saved openings)
    repertoire: JSON.parse(localStorage.getItem('chess_repertoire') || '[]'),

    // Board interaction
    squareStyles: {},
    pieceSquare: "",
  };

  game = null;

  componentDidMount() {
    this.game = new Chess();
    this.updateMatchingOpenings();
  }

  updateMatchingOpenings = () => {
    const movesSan = this.state.moveHistory.map(m => m.san);
    const matching = OPENING_DATABASE.filter(opening => {
      if (opening.moves.length < movesSan.length) return false;
      for (let i = 0; i < movesSan.length; i++) {
        if (opening.moves[i] !== movesSan[i]) return false;
      }
      return true;
    });

    // Find exact match
    const exact = OPENING_DATABASE.find(opening =>
      opening.moves.length === movesSan.length &&
      opening.moves.every((m, i) => m === movesSan[i])
    );

    this.setState({
      matchingOpenings: matching,
      currentOpening: exact || null,
    });
  };

  onSquareClick = (square) => {
    if (this.state.viewMode === "train") {
      this.handleTrainingClick(square);
      return;
    }

    const { pieceSquare } = this.state;

    if (pieceSquare === square) {
      this.setState({ squareStyles: {}, pieceSquare: "" });
      return;
    }

    if (pieceSquare) {
      const move = this.game.move({
        from: pieceSquare,
        to: square,
        promotion: "q",
      });

      if (move) {
        this.setState({
          fen: this.game.fen(),
          moveHistory: this.game.history({ verbose: true }),
          squareStyles: {},
          pieceSquare: "",
        }, this.updateMatchingOpenings);
        return;
      }
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.game.turn()) {
      const moves = this.game.moves({ square, verbose: true });
      const highlights = {};
      moves.forEach(m => {
        highlights[m.to] = {
          background: "radial-gradient(circle, rgba(0,255,0,0.3) 25%, transparent 25%)",
        };
      });
      highlights[square] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      this.setState({ squareStyles: highlights, pieceSquare: square });
    }
  };

  onDrop = ({ sourceSquare, targetSquare }) => {
    if (this.state.viewMode === "train") {
      this.handleTrainingMove(sourceSquare, targetSquare);
      return;
    }

    const move = this.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move) {
      this.setState({
        fen: this.game.fen(),
        moveHistory: this.game.history({ verbose: true }),
        squareStyles: {},
        pieceSquare: "",
      }, this.updateMatchingOpenings);
    }
  };

  handleTrainingClick = (square) => {
    const { pieceSquare } = this.state;

    if (pieceSquare === square) {
      this.setState({ squareStyles: {}, pieceSquare: "" });
      return;
    }

    if (pieceSquare) {
      this.handleTrainingMove(pieceSquare, square);
      return;
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.game.turn()) {
      const moves = this.game.moves({ square, verbose: true });
      const highlights = {};
      moves.forEach(m => {
        highlights[m.to] = {
          background: "radial-gradient(circle, rgba(0,255,0,0.3) 25%, transparent 25%)",
        };
      });
      highlights[square] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      this.setState({ squareStyles: highlights, pieceSquare: square });
    }
  };

  handleTrainingMove = (from, to) => {
    const { trainingOpening, trainingStep } = this.state;
    const training = OPENING_TRAINING[trainingOpening.name];
    if (!training || trainingStep >= training.length) return;

    const puzzle = training[trainingStep];
    const move = this.game.move({ from, to, promotion: "q" });

    if (!move) {
      this.setState({ squareStyles: {}, pieceSquare: "" });
      return;
    }

    const isCorrect = move.san === puzzle.correctMove;

    if (isCorrect) {
      this.setState(state => ({
        fen: this.game.fen(),
        trainingCorrect: state.trainingCorrect + 1,
        trainingStep: state.trainingStep + 1,
        trainingFeedback: { type: "correct", message: "正确! Correct!" },
        squareStyles: {
          [from]: { backgroundColor: "rgba(34, 197, 94, 0.5)" },
          [to]: { backgroundColor: "rgba(34, 197, 94, 0.7)" },
        },
        pieceSquare: "",
        showTrainingHint: false,
      }), () => {
        setTimeout(() => {
          this.setState({ trainingFeedback: null });
          this.loadNextTrainingPosition();
        }, 1000);
      });
    } else {
      this.game.undo();
      this.setState(state => ({
        trainingWrong: state.trainingWrong + 1,
        trainingFeedback: { type: "wrong", message: "再试一次 Try again" },
        squareStyles: {
          [from]: { backgroundColor: "rgba(239, 68, 68, 0.5)" },
          [to]: { backgroundColor: "rgba(239, 68, 68, 0.7)" },
        },
        pieceSquare: "",
      }), () => {
        setTimeout(() => {
          this.setState({ trainingFeedback: null, squareStyles: {} });
        }, 1000);
      });
    }
  };

  loadNextTrainingPosition = () => {
    const { trainingOpening, trainingStep } = this.state;
    const training = OPENING_TRAINING[trainingOpening.name];

    if (!training || trainingStep >= training.length) {
      // Training complete
      return;
    }

    const puzzle = training[trainingStep];
    this.game = new Chess(puzzle.fen);
    this.setState({
      fen: puzzle.fen,
      squareStyles: {},
    });
  };

  resetExplorer = () => {
    this.game = new Chess();
    this.setState({
      fen: "start",
      moveHistory: [],
      currentOpening: null,
      matchingOpenings: [],
      squareStyles: {},
      pieceSquare: "",
    }, this.updateMatchingOpenings);
  };

  undoMove = () => {
    if (this.game.history().length === 0) return;
    this.game.undo();
    this.setState({
      fen: this.game.fen(),
      moveHistory: this.game.history({ verbose: true }),
      squareStyles: {},
      pieceSquare: "",
    }, this.updateMatchingOpenings);
  };

  playOpening = (opening) => {
    this.game = new Chess();
    opening.moves.forEach(move => this.game.move(move));
    this.setState({
      fen: this.game.fen(),
      moveHistory: this.game.history({ verbose: true }),
      selectedOpening: opening,
      expandedOpening: opening.eco,
    }, this.updateMatchingOpenings);
  };

  startTraining = (opening) => {
    const training = OPENING_TRAINING[opening.name];
    if (!training || training.length === 0) {
      alert("Training not available for this opening yet / 此开局暂无训练题目");
      return;
    }

    this.game = new Chess(training[0].fen);
    this.setState({
      viewMode: "train",
      trainingOpening: opening,
      trainingStep: 0,
      trainingCorrect: 0,
      trainingWrong: 0,
      fen: training[0].fen,
      showTrainingHint: false,
      trainingFeedback: null,
    });
  };

  exitTraining = () => {
    this.game = new Chess();
    this.setState({
      viewMode: "explore",
      trainingOpening: null,
      fen: "start",
      moveHistory: [],
    }, this.updateMatchingOpenings);
  };

  toggleRepertoire = (opening) => {
    let repertoire = [...this.state.repertoire];
    const index = repertoire.findIndex(o => o.eco === opening.eco);

    if (index >= 0) {
      repertoire.splice(index, 1);
    } else {
      repertoire.push({ eco: opening.eco, name: opening.name, nameCn: opening.nameCn });
    }

    localStorage.setItem('chess_repertoire', JSON.stringify(repertoire));
    this.setState({ repertoire });
  };

  isInRepertoire = (opening) => {
    return this.state.repertoire.some(o => o.eco === opening.eco);
  };

  getFilteredOpenings = () => {
    let openings = OPENING_DATABASE;

    if (this.state.filterDifficulty) {
      openings = openings.filter(o => o.difficulty === this.state.filterDifficulty);
    }

    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      openings = openings.filter(o =>
        o.name.toLowerCase().includes(query) ||
        o.nameCn.includes(query) ||
        o.eco.toLowerCase().includes(query)
      );
    }

    if (this.state.viewMode === "repertoire") {
      openings = openings.filter(o => this.isInRepertoire(o));
    }

    return openings;
  };

  render() {
    const {
      fen, moveHistory, currentOpening, matchingOpenings,
      viewMode, selectedOpening, expandedOpening, filterDifficulty, searchQuery,
      trainingOpening, trainingStep, trainingCorrect, trainingWrong,
      showTrainingHint, trainingFeedback, squareStyles, repertoire
    } = this.state;

    const filteredOpenings = this.getFilteredOpenings();
    const training = trainingOpening ? OPENING_TRAINING[trainingOpening.name] : null;
    const currentTrainingPuzzle = training && trainingStep < training.length ? training[trainingStep] : null;

    return (
      <div className="opening-explorer-container">
        {/* Left Panel - Opening List */}
        <div className="opening-sidebar">
          <div className="panel-title">📖 Opening Explorer / 开局库</div>

          {/* View Mode Tabs */}
          <div className="view-mode-tabs">
            <button
              className={`mode-tab ${viewMode === 'explore' ? 'active' : ''}`}
              onClick={() => this.setState({ viewMode: 'explore' })}
            >
              🔍 Explore
            </button>
            <button
              className={`mode-tab ${viewMode === 'repertoire' ? 'active' : ''}`}
              onClick={() => this.setState({ viewMode: 'repertoire' })}
            >
              ⭐ My Repertoire ({repertoire.length})
            </button>
          </div>

          {/* Search */}
          <div className="opening-search">
            <input
              type="text"
              placeholder="Search openings / 搜索开局..."
              value={searchQuery}
              onChange={(e) => this.setState({ searchQuery: e.target.value })}
            />
          </div>

          {/* Difficulty Filter */}
          <div className="difficulty-filter">
            <span className="filter-label">Difficulty:</span>
            <div className="filter-buttons">
              {[null, 1, 2, 3, 4].map(d => (
                <button
                  key={d || 'all'}
                  className={`filter-btn ${filterDifficulty === d ? 'active' : ''}`}
                  onClick={() => this.setState({ filterDifficulty: d })}
                >
                  {d === null ? 'All' : '⭐'.repeat(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Opening List */}
          <div className="opening-list">
            {filteredOpenings.map(opening => (
              <div
                key={opening.eco}
                className={`opening-item ${selectedOpening?.eco === opening.eco ? 'selected' : ''} ${expandedOpening === opening.eco ? 'expanded' : ''}`}
              >
                <div
                  className="opening-header"
                  onClick={() => this.setState({
                    expandedOpening: expandedOpening === opening.eco ? null : opening.eco
                  })}
                >
                  <div className="opening-main">
                    <span className="opening-eco">{opening.eco}</span>
                    <div className="opening-names">
                      <span className="opening-name">{opening.name}</span>
                      <span className="opening-name-cn">{opening.nameCn}</span>
                    </div>
                  </div>
                  <div className="opening-meta">
                    <span className="opening-difficulty">{'⭐'.repeat(opening.difficulty)}</span>
                    {this.isInRepertoire(opening) && <span className="in-repertoire">⭐</span>}
                  </div>
                </div>

                {expandedOpening === opening.eco && (
                  <div className="opening-details">
                    <p className="opening-desc">{opening.descriptionCn}</p>
                    <p className="opening-desc-en">{opening.description}</p>

                    <div className="opening-stats">
                      <div className="win-bar">
                        <div className="white-wins" style={{ width: `${opening.winRate.white * 100}%` }}>
                          {Math.round(opening.winRate.white * 100)}%
                        </div>
                        <div className="draws" style={{ width: `${opening.winRate.draw * 100}%` }}>
                          {Math.round(opening.winRate.draw * 100)}%
                        </div>
                        <div className="black-wins" style={{ width: `${opening.winRate.black * 100}%` }}>
                          {Math.round(opening.winRate.black * 100)}%
                        </div>
                      </div>
                      <div className="win-labels">
                        <span>White</span>
                        <span>Draw</span>
                        <span>Black</span>
                      </div>
                    </div>

                    <div className="opening-actions">
                      <button className="btn btn-sm" onClick={() => this.playOpening(opening)}>
                        ▶ Play
                      </button>
                      <button className="btn btn-sm" onClick={() => this.startTraining(opening)}>
                        🎯 Train
                      </button>
                      <button
                        className={`btn btn-sm ${this.isInRepertoire(opening) ? 'active' : ''}`}
                        onClick={() => this.toggleRepertoire(opening)}
                      >
                        {this.isInRepertoire(opening) ? '★ Saved' : '☆ Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center - Board */}
        <div className="opening-board-area">
          {viewMode === "train" && trainingOpening ? (
            <>
              <div className="training-header">
                <h3>🎯 Training: {trainingOpening.name}</h3>
                <p>{trainingOpening.nameCn}</p>
              </div>

              <div className="training-progress">
                <span>Step {trainingStep + 1} / {training?.length || 0}</span>
                <span className="training-score">
                  ✓ {trainingCorrect} | ✗ {trainingWrong}
                </span>
              </div>

              {trainingFeedback && (
                <div className={`training-feedback ${trainingFeedback.type}`}>
                  {trainingFeedback.message}
                </div>
              )}

              {trainingStep >= (training?.length || 0) ? (
                <div className="training-complete">
                  <h3>🎉 Training Complete!</h3>
                  <p>Correct: {trainingCorrect} | Wrong: {trainingWrong}</p>
                  <button className="btn btn-primary" onClick={this.exitTraining}>
                    Back to Explorer
                  </button>
                </div>
              ) : (
                <>
                  <Chessboard
                    id="openingboard"
                    position={fen}
                    width={480}
                    calcWidth={calcBoardWidth(480)}
                    orientation="white"
                    onDrop={this.onDrop}
                    onSquareClick={this.onSquareClick}
                    squareStyles={squareStyles}
                    boardStyle={{
                      borderRadius: "8px",
                      boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)",
                    }}
                  />

                  <div className="training-controls">
                    <button
                      className="btn btn-hint"
                      onClick={() => this.setState({ showTrainingHint: true })}
                    >
                      💡 Hint
                    </button>
                    <button className="btn btn-secondary" onClick={this.exitTraining}>
                      Exit Training
                    </button>
                  </div>

                  {showTrainingHint && currentTrainingPuzzle && (
                    <div className="hint-display">
                      <p>{currentTrainingPuzzle.hint}</p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Current Opening Display */}
              <div className="current-opening-display">
                {currentOpening ? (
                  <>
                    <span className="current-eco">{currentOpening.eco}</span>
                    <span className="current-name">{currentOpening.name}</span>
                    <span className="current-name-cn">{currentOpening.nameCn}</span>
                  </>
                ) : matchingOpenings.length > 0 ? (
                  <span className="matching-count">
                    {matchingOpenings.length} possible openings
                  </span>
                ) : (
                  <span className="no-opening">Unknown position</span>
                )}
              </div>

              <Chessboard
                id="openingboard"
                position={fen}
                width={480}
                calcWidth={calcBoardWidth(480)}
                orientation="white"
                onDrop={this.onDrop}
                onSquareClick={this.onSquareClick}
                squareStyles={squareStyles}
                boardStyle={{
                  borderRadius: "8px",
                  boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)",
                }}
              />

              {/* Controls */}
              <div className="explorer-controls">
                <button className="btn btn-secondary" onClick={this.undoMove} disabled={moveHistory.length === 0}>
                  ← Undo
                </button>
                <button className="btn btn-primary" onClick={this.resetExplorer}>
                  🔄 Reset
                </button>
              </div>

              {/* Move History */}
              <div className="explorer-moves">
                <span className="moves-label">Moves:</span>
                {moveHistory.length === 0 ? (
                  <span className="no-moves">Start position</span>
                ) : (
                  moveHistory.map((m, i) => (
                    <span key={i} className="move-item">
                      {i % 2 === 0 && <span className="move-num">{Math.floor(i / 2) + 1}.</span>}
                      {m.san}
                    </span>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Opening Details */}
        <div className="opening-info-panel">
          {selectedOpening && viewMode !== "train" ? (
            <>
              <div className="panel-title">{selectedOpening.name}</div>
              <p className="opening-detail-cn">{selectedOpening.nameCn}</p>

              <div className="key-ideas">
                <div className="section-label">💡 Key Ideas / 关键思路</div>
                {selectedOpening.keyIdeas.map((idea, i) => (
                  <div key={i} className="key-idea">
                    <p>{idea.cn}</p>
                    <p className="idea-en">{idea.en}</p>
                  </div>
                ))}
              </div>

              <div className="opening-moves-section">
                <div className="section-label">📝 Moves / 着法</div>
                <div className="moves-display">
                  {selectedOpening.moves.map((m, i) => (
                    <span key={i} className="move-item">
                      {i % 2 === 0 && <span className="move-num">{Math.floor(i / 2) + 1}.</span>}
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="vip-promo">
                <div className="vip-badge">💎 VIP</div>
                <p>Get full opening database with 1000+ variations!</p>
                <p>获取完整开局库，包含1000+变例！</p>
                <button className="btn btn-vip" disabled>Coming Soon</button>
              </div>
            </>
          ) : (
            <div className="opening-help">
              <div className="panel-title">How to Use / 使用说明</div>
              <ul>
                <li>Click openings to see details</li>
                <li>点击开局查看详情</li>
                <li>Play moves on the board to explore</li>
                <li>在棋盘上走子来探索</li>
                <li>Use ▶ Play to load an opening</li>
                <li>使用 ▶ Play 加载开局</li>
                <li>Use 🎯 Train to practice</li>
                <li>使用 🎯 Train 来练习</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default OpeningExplorer;
