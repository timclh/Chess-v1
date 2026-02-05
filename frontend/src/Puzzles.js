import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";

// Puzzle categories
const PUZZLE_CATEGORIES = {
  fork: { name: '双击 Fork', icon: '⚔️', description: '一子攻击多个目标' },
  pin: { name: '牵制 Pin', icon: '📌', description: '限制对方棋子移动' },
  skewer: { name: '串击 Skewer', icon: '🔪', description: '攻击后排目标' },
  mate: { name: '将杀 Checkmate', icon: '👑', description: '将死对方王' },
  discovery: { name: '闪击 Discovery', icon: '💥', description: '移开一子露出攻击' },
  sacrifice: { name: '弃子 Sacrifice', icon: '🎁', description: '弃子换取优势' },
  defense: { name: '防守 Defense', icon: '🛡️', description: '化解对方威胁' },
  endgame: { name: '残局 Endgame', icon: '🏁', description: '残局制胜技巧' },
};

// Puzzle database - organized by difficulty
const PUZZLES = [
  // Easy puzzles (1-star)
  {
    id: 1,
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    solution: ["Qxf7#"],
    category: "mate",
    difficulty: 1,
    title: "学者将杀 Scholar's Mate",
    hint: "后可以直接将死",
    hintEn: "The Queen can deliver checkmate directly",
  },
  {
    id: 2,
    fen: "r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4",
    solution: ["Bxf7+", "Ke7", "Bb3"],
    category: "sacrifice",
    difficulty: 1,
    title: "炸开城门 Open the King",
    hint: "牺牲象打开敌王防线",
    hintEn: "Sacrifice the bishop to expose the king",
  },
  {
    id: 3,
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    solution: ["Nxe5"],
    category: "fork",
    difficulty: 1,
    title: "中心吃子 Central Capture",
    hint: "马可以吃掉无保护的兵",
    hintEn: "The knight can capture the undefended pawn",
  },
  {
    id: 4,
    fen: "rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2",
    solution: ["e5"],
    category: "defense",
    difficulty: 1,
    title: "推进中心 Advance the Center",
    hint: "推进兵攻击马",
    hintEn: "Push the pawn to attack the knight",
  },
  {
    id: 5,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5",
    solution: ["Bg5"],
    category: "pin",
    difficulty: 1,
    title: "牵制马 Pin the Knight",
    hint: "象可以牵制f6的马",
    hintEn: "The bishop can pin the knight on f6",
  },

  // Medium puzzles (2-star)
  {
    id: 6,
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solution: ["Ng5", "d5", "exd5", "Na5", "Bb5+"],
    category: "sacrifice",
    difficulty: 2,
    title: "意大利进攻 Italian Attack",
    hint: "马跳到g5攻击f7弱点",
    hintEn: "Jump the knight to g5 attacking the f7 weakness",
  },
  {
    id: 7,
    fen: "r2qkbnr/ppp2ppp/2np4/4N3/2B1P1b1/8/PPPP1PPP/RNBQK2R w KQkq - 1 5",
    solution: ["Nxf7", "Kxf7", "Bxg8+"],
    category: "sacrifice",
    difficulty: 2,
    title: "双弃 Double Sacrifice",
    hint: "马吃f7，然后象吃车",
    hintEn: "Knight takes f7, then bishop takes rook",
  },
  {
    id: 8,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 6",
    solution: ["Bg5", "h6", "Bh4", "g5", "Nxg5"],
    category: "pin",
    difficulty: 2,
    title: "希腊礼物 Greek Gift",
    hint: "先牵制，再利用牵制进攻",
    hintEn: "Pin first, then exploit the pin",
  },
  {
    id: 9,
    fen: "r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 6 7",
    solution: ["O-O", "O-O", "Bg5"],
    category: "defense",
    difficulty: 2,
    title: "王城安全 Castle for Safety",
    hint: "先易位保护王",
    hintEn: "Castle first to protect your king",
  },
  {
    id: 10,
    fen: "r1bqk2r/ppp2ppp/2n1pn2/3p4/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6",
    solution: ["a3", "Ba5", "b4", "Bb6", "c5"],
    category: "defense",
    difficulty: 2,
    title: "攻击象 Attack the Bishop",
    hint: "用兵逼退象",
    hintEn: "Use pawns to push back the bishop",
  },

  // Hard puzzles (3-star)
  {
    id: 11,
    fen: "r2q1rk1/ppp2ppp/2n1bn2/3pp3/2B1P1b1/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8",
    solution: ["Bxf7+", "Rxf7", "Ng5", "Rf8", "Qxg4"],
    category: "sacrifice",
    difficulty: 3,
    title: "弃象开局 Bishop Sacrifice",
    hint: "Bxf7+开始战术组合",
    hintEn: "Bxf7+ starts a tactical combination",
  },
  {
    id: 12,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5",
    solution: ["Nc3", "d6", "Bg5", "h6", "Bh4", "g5", "Nxg5"],
    category: "sacrifice",
    difficulty: 3,
    title: "逐步施压 Gradual Pressure",
    hint: "发展棋子同时保持对f7的压力",
    hintEn: "Develop pieces while maintaining pressure on f7",
  },
  {
    id: 13,
    fen: "r2qk2r/ppp1bppp/2n1bn2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 7",
    solution: ["exd5", "exd5", "Bg5", "O-O", "Bxf6", "Bxf6", "Nxd5"],
    category: "sacrifice",
    difficulty: 3,
    title: "中心突破 Central Breakthrough",
    hint: "打开中心，利用发展优势",
    hintEn: "Open the center, exploit development advantage",
  },
  {
    id: 14,
    fen: "r1b1k2r/ppppqppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 6 6",
    solution: ["O-O", "Bxc3", "bxc3", "Nxe4", "Qe2"],
    category: "defense",
    difficulty: 3,
    title: "接受弃兵 Accept the Gambit",
    hint: "易位后黑方吃兵有风险",
    hintEn: "After castling, Black taking the pawn is risky",
  },
  {
    id: 15,
    fen: "r2qkb1r/ppp1pppp/2n2n2/3p4/2PP2b1/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 4 5",
    solution: ["cxd5", "Nxd5", "e4", "Nxc3", "bxc3"],
    category: "sacrifice",
    difficulty: 3,
    title: "后翼弃兵变例 Queen's Gambit Line",
    hint: "吃掉中心兵，打开局面",
    hintEn: "Capture the central pawn, open up the position",
  },

  // Expert puzzles (4-star)
  {
    id: 16,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5",
    solution: ["Ng5", "O-O", "Qh5", "h6", "Nxf7", "Rxf7", "Qxf7+", "Kh8", "Qf8#"],
    category: "mate",
    difficulty: 4,
    title: "闷杀进攻 Smothered Mate Attack",
    hint: "马跳g5开始致命进攻",
    hintEn: "Knight to g5 starts a deadly attack",
  },
  {
    id: 17,
    fen: "r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 6 6",
    solution: ["Bg5", "h6", "Bxf6", "Qxf6", "Nd5", "Qd8", "c3", "Bb6", "a4"],
    category: "sacrifice",
    difficulty: 4,
    title: "长线进攻 Long-term Attack",
    hint: "换掉防守的马，占据d5",
    hintEn: "Trade the defending knight, occupy d5",
  },
  {
    id: 18,
    fen: "r2q1rk1/ppp1bppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 2 9",
    solution: ["e4", "dxe4", "Nxe4", "Nxe4", "Bxe4"],
    category: "sacrifice",
    difficulty: 4,
    title: "中心爆破 Central Explosion",
    hint: "e4推进打开局面",
    hintEn: "Push e4 to open up the position",
  },
  {
    id: 19,
    fen: "r1bq1rk1/ppp2ppp/2n1pn2/3p4/1bPP4/2NBPN2/PP3PPP/R1BQK2R w KQ - 2 7",
    solution: ["cxd5", "exd5", "O-O", "Bd6", "Bg5", "h6", "Bh4"],
    category: "pin",
    difficulty: 4,
    title: "卡尔斯巴德结构 Carlsbad Structure",
    hint: "吃掉d5兵，形成少数派进攻",
    hintEn: "Capture d5 pawn, create minority attack",
  },
  {
    id: 20,
    fen: "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
    solution: ["e3", "O-O", "Bd3", "d5", "cxd5", "exd5", "Nge2"],
    category: "defense",
    difficulty: 4,
    title: "尼姆佐维奇防御 Nimzo-Indian Setup",
    hint: "稳健发展，避免双象",
    hintEn: "Solid development, avoid doubled pawns",
  },
];

// Get today's date string for daily tracking (ISO format for consistent parsing)
const getTodayKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get daily puzzles (3 puzzles rotating by date)
const getDailyPuzzles = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const startIndex = (dayOfYear * 3) % PUZZLES.length;

  const dailyPuzzles = [];
  for (let i = 0; i < 3; i++) {
    dailyPuzzles.push(PUZZLES[(startIndex + i) % PUZZLES.length]);
  }
  return dailyPuzzles;
};

class Puzzles extends Component {
  state = {
    // Puzzle state
    currentPuzzleIndex: 0,
    currentMoveIndex: 0,
    fen: "",
    squareStyles: {},
    pieceSquare: "",
    puzzleSolved: false,
    puzzleFailed: false,
    showHint: false,

    // Daily tracking
    dailyPuzzles: [],
    solvedToday: JSON.parse(localStorage.getItem(`puzzles_solved_${getTodayKey()}`) || '[]'),
    streak: parseInt(localStorage.getItem('puzzle_streak') || '0'),
    lastPlayDate: localStorage.getItem('puzzle_last_date') || '',
    totalSolved: parseInt(localStorage.getItem('puzzle_total_solved') || '0'),

    // Stats
    puzzleStats: JSON.parse(localStorage.getItem('puzzle_stats') || '{}'),

    // UI state
    showCategoryFilter: false,
    selectedCategory: null,
    viewMode: 'daily', // 'daily' | 'practice' | 'stats'
  };

  game = null;

  componentDidMount() {
    this.game = new Chess();
    this.updateStreak();
    this.loadDailyPuzzles();
  }

  updateStreak = () => {
    const today = getTodayKey();
    const lastDate = this.state.lastPlayDate;

    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const diffDays = Math.floor((todayObj - lastDateObj) / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        // Streak broken
        this.setState({ streak: 0 });
        localStorage.setItem('puzzle_streak', '0');
      }
    }
  };

  loadDailyPuzzles = () => {
    const dailyPuzzles = getDailyPuzzles();
    this.setState({ dailyPuzzles }, () => {
      this.loadPuzzle(0);
    });
  };

  loadPuzzle = (index) => {
    const puzzles = this.state.viewMode === 'daily'
      ? this.state.dailyPuzzles
      : this.getFilteredPuzzles();

    if (index >= puzzles.length) return;

    const puzzle = puzzles[index];
    this.game = new Chess(puzzle.fen);

    this.setState({
      currentPuzzleIndex: index,
      currentMoveIndex: 0,
      fen: puzzle.fen,
      squareStyles: {},
      pieceSquare: "",
      puzzleSolved: false,
      puzzleFailed: false,
      showHint: false,
    });
  };

  getFilteredPuzzles = () => {
    const { selectedCategory } = this.state;
    if (!selectedCategory) return PUZZLES;
    return PUZZLES.filter(p => p.category === selectedCategory);
  };

  getCurrentPuzzle = () => {
    const puzzles = this.state.viewMode === 'daily'
      ? this.state.dailyPuzzles
      : this.getFilteredPuzzles();
    return puzzles[this.state.currentPuzzleIndex];
  };

  highlightSquare = (sourceSquare, squaresToHighlight) => {
    const highlightStyles = [sourceSquare, ...squaresToHighlight].reduce(
      (a, c) => ({
        ...a,
        [c]: {
          background: "radial-gradient(circle, rgba(255,255,0,0.4) 25%, transparent 25%)",
          borderRadius: "50%",
        },
      }),
      {}
    );

    if (sourceSquare) {
      highlightStyles[sourceSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
    }

    this.setState({ squareStyles: highlightStyles });
  };

  onSquareClick = (square) => {
    if (!this.game || this.state.puzzleSolved || this.state.puzzleFailed) return;

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

      if (move !== null) {
        this.checkMove(move);
        return;
      }
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.game.turn()) {
      const moves = this.game.moves({ square, verbose: true });
      const squaresToHighlight = moves.map((m) => m.to);
      this.highlightSquare(square, squaresToHighlight);
      this.setState({ pieceSquare: square });
    }
  };

  onDrop = ({ sourceSquare, targetSquare }) => {
    if (!this.game || this.state.puzzleSolved || this.state.puzzleFailed) return;

    const piece = this.game.get(sourceSquare);
    if (!piece || piece.color !== this.game.turn()) return;

    const move = this.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move !== null) {
      this.checkMove(move);
    }
  };

  checkMove = (move) => {
    const puzzle = this.getCurrentPuzzle();
    const expectedMove = puzzle.solution[this.state.currentMoveIndex];

    // Check if move matches (handle different notations)
    const isCorrect = move.san === expectedMove ||
      move.san.replace(/[+#]/, '') === expectedMove.replace(/[+#]/, '');

    if (isCorrect) {
      const nextMoveIndex = this.state.currentMoveIndex + 1;

      // Highlight correct move in green
      this.setState({
        fen: this.game.fen(),
        squareStyles: {
          [move.from]: { backgroundColor: "rgba(34, 197, 94, 0.5)" },
          [move.to]: { backgroundColor: "rgba(34, 197, 94, 0.7)" },
        },
        pieceSquare: "",
        currentMoveIndex: nextMoveIndex,
      });

      // Check if puzzle is complete
      if (nextMoveIndex >= puzzle.solution.length) {
        this.puzzleCompleted();
      } else {
        // Make opponent's response after a delay
        setTimeout(() => this.makeOpponentMove(), 500);
      }
    } else {
      // Wrong move - undo and show red
      this.game.undo();
      this.setState({
        squareStyles: {
          [move.from]: { backgroundColor: "rgba(239, 68, 68, 0.5)" },
          [move.to]: { backgroundColor: "rgba(239, 68, 68, 0.7)" },
        },
        pieceSquare: "",
        puzzleFailed: true,
      });
    }
  };

  makeOpponentMove = () => {
    const puzzle = this.getCurrentPuzzle();
    const opponentMove = puzzle.solution[this.state.currentMoveIndex];

    if (!opponentMove) return;

    const move = this.game.move(opponentMove);
    if (move) {
      this.setState({
        fen: this.game.fen(),
        squareStyles: {
          [move.from]: { backgroundColor: "rgba(100, 116, 139, 0.5)" },
          [move.to]: { backgroundColor: "rgba(100, 116, 139, 0.7)" },
        },
        currentMoveIndex: this.state.currentMoveIndex + 1,
      });
    }
  };

  puzzleCompleted = () => {
    const puzzle = this.getCurrentPuzzle();
    const today = getTodayKey();

    // Update solved today
    let solvedToday = [...this.state.solvedToday];
    if (!solvedToday.includes(puzzle.id)) {
      solvedToday.push(puzzle.id);
      localStorage.setItem(`puzzles_solved_${today}`, JSON.stringify(solvedToday));
    }

    // Update total solved
    const totalSolved = this.state.totalSolved + 1;
    localStorage.setItem('puzzle_total_solved', totalSolved.toString());

    // Update streak
    let streak = this.state.streak;
    const lastDate = this.state.lastPlayDate;
    if (lastDate !== today) {
      streak += 1;
      localStorage.setItem('puzzle_streak', streak.toString());
      localStorage.setItem('puzzle_last_date', today);
    }

    // Update category stats
    const stats = { ...this.state.puzzleStats };
    if (!stats[puzzle.category]) {
      stats[puzzle.category] = { solved: 0, attempted: 0 };
    }
    stats[puzzle.category].solved += 1;
    stats[puzzle.category].attempted += 1;
    localStorage.setItem('puzzle_stats', JSON.stringify(stats));

    this.setState({
      puzzleSolved: true,
      solvedToday,
      totalSolved,
      streak,
      lastPlayDate: today,
      puzzleStats: stats,
    });
  };

  retryPuzzle = () => {
    this.loadPuzzle(this.state.currentPuzzleIndex);
  };

  nextPuzzle = () => {
    const puzzles = this.state.viewMode === 'daily'
      ? this.state.dailyPuzzles
      : this.getFilteredPuzzles();

    if (this.state.currentPuzzleIndex < puzzles.length - 1) {
      this.loadPuzzle(this.state.currentPuzzleIndex + 1);
    }
  };

  prevPuzzle = () => {
    if (this.state.currentPuzzleIndex > 0) {
      this.loadPuzzle(this.state.currentPuzzleIndex - 1);
    }
  };

  toggleHint = () => {
    this.setState(state => ({ showHint: !state.showHint }));
  };

  setViewMode = (mode) => {
    this.setState({ viewMode: mode, currentPuzzleIndex: 0 }, () => {
      if (mode === 'daily') {
        this.loadDailyPuzzles();
      } else if (mode === 'practice') {
        this.loadPuzzle(0);
      }
    });
  };

  setCategory = (category) => {
    this.setState({ selectedCategory: category, currentPuzzleIndex: 0 }, () => {
      this.loadPuzzle(0);
    });
  };

  render() {
    const {
      fen, squareStyles, puzzleSolved, puzzleFailed, showHint,
      dailyPuzzles, solvedToday, streak, totalSolved,
      viewMode, selectedCategory, puzzleStats, currentPuzzleIndex
    } = this.state;

    const puzzle = this.getCurrentPuzzle();
    const puzzles = viewMode === 'daily' ? dailyPuzzles : this.getFilteredPuzzles();
    const category = puzzle ? PUZZLE_CATEGORIES[puzzle.category] : null;
    const isPuzzleSolvedToday = puzzle && solvedToday.includes(puzzle.id);

    return (
      <div className="puzzles-container">
        {/* Left Panel - Stats & Navigation */}
        <div className="puzzles-sidebar">
          <div className="panel-title">🧩 Daily Puzzles / 每日谜题</div>

          {/* Streak Display */}
          <div className="streak-display">
            <div className="streak-icon">🔥</div>
            <div className="streak-info">
              <div className="streak-number">{streak}</div>
              <div className="streak-label">Day Streak / 连续天数</div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="puzzle-stats-summary">
            <div className="stat-item">
              <span className="stat-value">{totalSolved}</span>
              <span className="stat-label">Total Solved / 总计完成</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{solvedToday.length}/3</span>
              <span className="stat-label">Today / 今日</span>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="view-mode-tabs">
            <button
              className={`mode-tab ${viewMode === 'daily' ? 'active' : ''}`}
              onClick={() => this.setViewMode('daily')}
            >
              📅 Daily / 每日
            </button>
            <button
              className={`mode-tab ${viewMode === 'practice' ? 'active' : ''}`}
              onClick={() => this.setViewMode('practice')}
            >
              🎯 Practice / 练习
            </button>
            <button
              className={`mode-tab ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => this.setViewMode('stats')}
            >
              📊 Stats / 统计
            </button>
          </div>

          {/* Category Filter (Practice mode) */}
          {viewMode === 'practice' && (
            <div className="category-filter">
              <div className="section-label">Category / 分类</div>
              <div className="category-buttons">
                <button
                  className={`cat-btn ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => this.setCategory(null)}
                >
                  All / 全部
                </button>
                {Object.entries(PUZZLE_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    className={`cat-btn ${selectedCategory === key ? 'active' : ''}`}
                    onClick={() => this.setCategory(key)}
                  >
                    {cat.icon} {cat.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Daily Puzzles List */}
          {viewMode === 'daily' && (
            <div className="daily-puzzles-list">
              <div className="section-label">Today's Puzzles / 今日谜题</div>
              {dailyPuzzles.map((p, index) => (
                <div
                  key={p.id}
                  className={`daily-puzzle-item ${currentPuzzleIndex === index ? 'active' : ''} ${solvedToday.includes(p.id) ? 'solved' : ''}`}
                  onClick={() => this.loadPuzzle(index)}
                >
                  <span className="puzzle-num">#{index + 1}</span>
                  <span className="puzzle-title">{p.title}</span>
                  <span className="puzzle-difficulty">
                    {'⭐'.repeat(p.difficulty)}
                  </span>
                  {solvedToday.includes(p.id) && <span className="solved-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center - Puzzle Board */}
        <div className="puzzle-board-area">
          {viewMode !== 'stats' && puzzle && (
            <>
              {/* Puzzle Info */}
              <div className="puzzle-info">
                <div className="puzzle-title-main">
                  {category?.icon} {puzzle.title}
                </div>
                <div className="puzzle-meta">
                  <span className="difficulty">{'⭐'.repeat(puzzle.difficulty)}</span>
                  <span className="category-badge">{category?.name}</span>
                </div>
              </div>

              {/* Status Message */}
              <div className={`puzzle-status ${puzzleSolved ? 'solved' : ''} ${puzzleFailed ? 'failed' : ''}`}>
                {puzzleSolved && '🎉 Solved! / 完成！'}
                {puzzleFailed && '❌ Wrong! Try again / 错误！再试一次'}
                {!puzzleSolved && !puzzleFailed && `${this.game?.turn() === 'w' ? 'White' : 'Black'} to move / ${this.game?.turn() === 'w' ? '白方' : '黑方'}走棋`}
              </div>

              {/* Chess Board */}
              <div className="puzzle-board-container">
                <Chessboard
                  id="puzzleboard"
                  position={fen}
                  width={480}
                  orientation={this.game?.turn() === 'b' ? 'black' : 'white'}
                  onDrop={this.onDrop}
                  onSquareClick={this.onSquareClick}
                  squareStyles={squareStyles}
                  boardStyle={{
                    borderRadius: "8px",
                    boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)",
                  }}
                  lightSquareStyle={{ backgroundColor: "#f0d9b5" }}
                  darkSquareStyle={{ backgroundColor: "#b58863" }}
                  draggable={!puzzleSolved && !puzzleFailed}
                />
              </div>

              {/* Controls */}
              <div className="puzzle-controls">
                <button
                  className="btn btn-secondary"
                  onClick={this.prevPuzzle}
                  disabled={currentPuzzleIndex === 0}
                >
                  ← Prev
                </button>
                <button
                  className="btn btn-hint"
                  onClick={this.toggleHint}
                >
                  💡 Hint
                </button>
                <button
                  className="btn btn-primary"
                  onClick={this.retryPuzzle}
                >
                  🔄 Retry
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={this.nextPuzzle}
                  disabled={currentPuzzleIndex >= puzzles.length - 1}
                >
                  Next →
                </button>
              </div>

              {/* Hint Display */}
              {showHint && (
                <div className="hint-display">
                  <p>{puzzle.hint}</p>
                  <p className="hint-en">{puzzle.hintEn}</p>
                </div>
              )}
            </>
          )}

          {/* Stats View */}
          {viewMode === 'stats' && (
            <div className="stats-view">
              <h2>📊 Puzzle Statistics / 谜题统计</h2>

              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-big-number">{totalSolved}</div>
                  <div className="stat-big-label">Total Solved / 总完成数</div>
                </div>
                <div className="stat-card streak-card">
                  <div className="stat-big-number">🔥 {streak}</div>
                  <div className="stat-big-label">Day Streak / 连续天数</div>
                </div>
              </div>

              <h3>By Category / 按分类</h3>
              <div className="category-stats">
                {Object.entries(PUZZLE_CATEGORIES).map(([key, cat]) => {
                  const stat = puzzleStats[key] || { solved: 0, attempted: 0 };
                  return (
                    <div key={key} className="category-stat-item">
                      <span className="cat-icon">{cat.icon}</span>
                      <span className="cat-name">{cat.name}</span>
                      <span className="cat-solved">{stat.solved} solved</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Progress & Tips */}
        {viewMode !== 'stats' && puzzle && (
          <div className="puzzle-info-panel">
            <div className="panel-title">💡 About This Puzzle</div>

            {/* Category Info */}
            <div className="category-info">
              <div className="cat-header">
                <span className="cat-icon-large">{category?.icon}</span>
                <div>
                  <div className="cat-name-large">{category?.name}</div>
                  <div className="cat-desc">{category?.description}</div>
                </div>
              </div>
            </div>

            {/* Solution Progress */}
            <div className="solution-progress">
              <div className="section-label">Progress / 进度</div>
              <div className="progress-dots">
                {puzzle.solution.map((_, index) => (
                  <div
                    key={index}
                    className={`progress-dot ${index < this.state.currentMoveIndex ? 'completed' : ''} ${index === this.state.currentMoveIndex ? 'current' : ''}`}
                  />
                ))}
              </div>
              <div className="progress-text">
                Move {Math.ceil(this.state.currentMoveIndex / 2) + 1} of {Math.ceil(puzzle.solution.length / 2)}
              </div>
            </div>

            {/* Tips */}
            <div className="puzzle-tips">
              <div className="section-label">Tips / 提示</div>
              <ul>
                <li>Look for checks, captures, and threats</li>
                <li>寻找将军、吃子和威胁</li>
                <li>Consider what your opponent wants to do</li>
                <li>考虑对手想要做什么</li>
              </ul>
            </div>

            {/* VIP Promo (future) */}
            <div className="vip-promo">
              <div className="vip-badge">💎 VIP</div>
              <p>Unlock unlimited puzzles, themed training, and more!</p>
              <p>解锁无限谜题、主题训练等更多功能！</p>
              <button className="btn btn-vip" disabled>Coming Soon</button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Puzzles;
