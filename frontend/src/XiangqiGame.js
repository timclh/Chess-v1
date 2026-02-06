/**
 * Xiangqi Game Component
 * 中国象棋游戏组件 - 支持AI对战、教练模式、教程模式
 */

import React, { Component } from 'react';
import Xiangqi, { PIECE_NAMES } from './xiangqi';
import XiangqiBoard from './XiangqiBoard';
import {
  findBestMove,
  getTopMoves,
  analyzePosition,
  getStrategicAdvice,
  explainAIMove,
  clearCache,
  resetPositionHistory,
} from './XiangqiAI';

// Tutorial lessons for Chinese Chess
const XIANGQI_LESSONS = [
  {
    id: 1,
    title: '棋子移动: 车',
    titleEn: 'Piece Movement: Chariot (Rook)',
    description: '车是最强的棋子，可以横向或纵向移动任意格数，不能跳过其他棋子。',
    descriptionEn: 'The Chariot is the most powerful piece. It moves horizontally or vertically any number of squares, but cannot jump over pieces.',
    fen: '4k4/9/9/9/9/9/9/9/9/R4K3',
    objective: '用车将军黑方的将',
    objectiveEn: 'Check the black general with the chariot',
    correctMoves: ['a0-a9'],
    hint: '车可以沿直线移动到棋盘任意位置',
    hintEn: 'The chariot can move along straight lines to any position',
  },
  {
    id: 2,
    title: '棋子移动: 马',
    titleEn: 'Piece Movement: Horse (Knight)',
    description: '马走"日"字，即先横（或竖）一格，再斜向走一格。注意：马的行进路线上如有其他棋子挡住，则不能走，称为"蹩马腿"。',
    descriptionEn: 'The Horse moves in an L-shape: one square orthogonally then one square diagonally. It can be blocked if a piece is adjacent to it in the direction it wants to move.',
    fen: '3k5/9/9/9/9/9/9/9/4N4/4K4',
    objective: '走两步马: 先到f3，再到d2',
    objectiveEn: 'Move the horse in 2 steps: first to f3, then to d2',
    correctMoves: ['e1-f3', 'f3-d2'],
    hint: '马走日字形',
    hintEn: 'The horse moves in an L-shape',
  },
  {
    id: 3,
    title: '棋子移动: 炮',
    titleEn: 'Piece Movement: Cannon',
    description: '炮的移动方式与车相同，但吃子时必须隔着一个棋子（称为"炮架"）才能吃掉目标。',
    descriptionEn: 'The Cannon moves like a Chariot, but captures by jumping over exactly one piece (the "screen") to capture the target.',
    fen: '3k5/4r4/9/9/4S4/9/9/4C4/9/4K4',
    objective: '用炮吃掉黑方的车',
    objectiveEn: 'Capture the black chariot with the cannon',
    correctMoves: ['e2-e8'],
    hint: '炮需要一个炮架才能吃子，这里兵就是炮架',
    hintEn: 'The cannon needs a screen piece to capture — the soldier is the screen',
  },
  {
    id: 4,
    title: '棋子移动: 象/相',
    titleEn: 'Piece Movement: Elephant/Minister',
    description: '象走"田"字，即斜向移动两格。象不能过河，只能在己方半边活动。如果"田"字中心有棋子，象不能走，称为"塞象眼"。',
    descriptionEn: 'The Elephant moves exactly two squares diagonally. It cannot cross the river and can be blocked if a piece is in the center of its path.',
    fen: '4k4/9/9/9/9/9/9/9/9/2EK2E2',
    objective: '走两步象: 先到a2，再到c4',
    objectiveEn: 'Move the elephant in 2 steps: first to a2, then to c4',
    correctMoves: ['c0-a2', 'a2-c4'],
    hint: '象走田字，不能过河',
    hintEn: 'Elephant moves diagonally two squares, cannot cross river',
  },
  {
    id: 5,
    title: '棋子移动: 士/仕',
    titleEn: 'Piece Movement: Advisor/Guard',
    description: '士只能在九宫格内斜向移动一格。',
    descriptionEn: 'The Advisor moves one square diagonally and must stay within the palace.',
    fen: '4k4/9/9/9/9/9/9/9/9/3KAA3',
    objective: '将仕移动到e1位置',
    objectiveEn: 'Move an advisor to e1',
    correctMoves: ['f0-e1'],
    hint: '仕只能在九宫格内斜走一步',
    hintEn: 'Advisor moves one square diagonally within the palace',
  },
  {
    id: 6,
    title: '棋子移动: 帅/将',
    titleEn: 'Piece Movement: General/King',
    description: '帅（将）只能在九宫格内移动，每次走一格，可横走或竖走。注意：两个帅将不能直接面对面（中间没有棋子）。',
    descriptionEn: 'The General moves one square orthogonally and must stay within the palace. The two generals cannot face each other directly on the same file.',
    fen: '3k5/9/9/9/9/9/9/9/9/4K4',
    objective: '将帅移动到f0位置',
    objectiveEn: 'Move the general to f0',
    correctMoves: ['e0-f0'],
    hint: '帅每次只能走一格',
    hintEn: 'The general can only move one square at a time',
  },
  {
    id: 7,
    title: '棋子移动: 兵/卒',
    titleEn: 'Piece Movement: Soldier/Pawn',
    description: '兵（卒）在过河前只能向前走一格。过河后可以向前或横向移动一格，但不能后退。',
    descriptionEn: 'Soldiers move one square forward before crossing the river. After crossing, they can also move horizontally, but never backward.',
    fen: '4k4/9/9/9/4S4/9/9/9/9/4K4',
    objective: '将兵向前移动一格',
    objectiveEn: 'Move the soldier forward one square',
    correctMoves: ['e5-e4'],
    hint: '过河前的兵只能向前走',
    hintEn: 'Soldiers can only move forward before crossing the river',
  },
  {
    id: 8,
    title: '将军与应将',
    titleEn: 'Check and Responding to Check',
    description: '当对方的将/帅被攻击时，称为"将军"。被将军时必须立即应对，否则就输了。',
    descriptionEn: 'When the General is under attack, it is called "check". You must respond to check immediately or lose the game.',
    fen: '3k5/9/9/9/9/9/9/4r4/9/4K4',
    objective: '红方被将军了！移动帅躲避',
    objectiveEn: 'Red is in check! Move the general to safety',
    correctMoves: ['e0-d0', 'e0-f0'],
    hint: '帅必须移动到不被攻击的位置',
    hintEn: 'The general must move to a safe square',
  },
  {
    id: 9,
    title: '简单杀法: 白脸将',
    titleEn: 'Basic Checkmate: Facing Generals',
    description: '两个将帅不能在同一条竖线上直接面对面（中间无子）。利用这个规则可以形成杀招。',
    descriptionEn: 'The two generals cannot face each other directly on the same file. This rule can be used to achieve checkmate.',
    fen: '3ka4/3a5/9/9/9/9/9/9/4R4/4K4',
    objective: '用车将死黑方（利用白脸将）',
    objectiveEn: 'Checkmate black with the chariot (using facing generals)',
    correctMoves: ['e1-e9'],
    hint: '车移到底线将军，将无处可逃',
    hintEn: 'Move the chariot to the back rank — the king has nowhere to run',
  },
  {
    id: 10,
    title: '简单杀法: 双车错',
    titleEn: 'Basic Checkmate: Double Chariots',
    description: '双车配合是最基本的杀法之一。',
    descriptionEn: 'Coordinating two chariots is one of the most basic checkmate patterns.',
    fen: '4k4/R8/9/9/9/9/9/9/8R/3K5',
    objective: '用双车将死黑方',
    objectiveEn: 'Checkmate black with the two chariots',
    correctMoves: ['i1-i9'],
    hint: '一车将军，另一车堵住退路',
    hintEn: 'One chariot gives check, the other blocks escape',
  },
];

class XiangqiGame extends Component {
  state = {
    fen: null,
    history: [],
    gameOver: false,
    gameStatus: '红方先行 / Red to move',
    gameMode: 'ai', // 'ai', 'coach', 'tutorial'
    playerColor: 'r', // 'r' for red, 'b' for black
    aiThinking: false,
    aiDifficulty: 2,
    // Coach mode state
    analysis: null,
    suggestedMoves: [],
    strategicAdvice: [],
    showHints: true,
    showCoachInAI: false, // Show coach hints in AI mode
    threatWarning: null, // Warning about opponent threats
    lastAIExplanation: '',
    // Tutorial state
    currentLesson: 0,
    lessonComplete: false,
    showTutorialHint: false,
    tutorialProgress: JSON.parse(localStorage.getItem('xiangqi_tutorial_progress') || '[]'),
    // Valid moves for selected piece
    validMoves: [],
    // Last move for highlighting
    lastMove: null,
  };

  game = null;

  componentDidMount() {
    this.game = new Xiangqi();

    // Try to load saved game state
    const savedState = this.loadGameState();
    if (savedState && savedState.fen) {
      this.game.loadFEN(savedState.fen);
      this.game.turn = savedState.turn || 'r';
      this.setState({
        fen: this.game.toFEN(),
        gameMode: savedState.gameMode || 'ai',
        playerColor: savedState.playerColor || 'r',
        aiDifficulty: savedState.aiDifficulty || 2,
        history: savedState.history || [],
        showCoachInAI: savedState.showCoachInAI || false,
      }, () => {
        this.updateGameStatus();
        // If it's AI's turn after loading, make AI move
        if ((this.state.gameMode === 'ai' || this.state.gameMode === 'coach')
            && this.game.turn !== this.state.playerColor
            && !this.state.gameOver) {
          setTimeout(() => this.makeAIMove(), 500);
        }
      });
    } else {
      this.setState({
        fen: this.game.toFEN(),
      });
      this.updateGameStatus();
    }
  }

  componentWillUnmount() {
    // Save state before unmount
    this.saveGameState();
    this.game = null;
  }

  // Save game state to localStorage
  saveGameState = () => {
    if (!this.game) return;

    const state = {
      fen: this.game.toFEN(),
      turn: this.game.turn,
      gameMode: this.state.gameMode,
      playerColor: this.state.playerColor,
      aiDifficulty: this.state.aiDifficulty,
      history: this.state.history,
      showCoachInAI: this.state.showCoachInAI,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem('xiangqi_game_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  };

  // Load game state from localStorage
  loadGameState = () => {
    try {
      const saved = localStorage.getItem('xiangqi_game_state');
      if (saved) {
        const state = JSON.parse(saved);
        // Only load if saved within last 24 hours
        if (state.savedAt && Date.now() - state.savedAt < 24 * 60 * 60 * 1000) {
          return state;
        }
      }
    } catch (e) {
      console.error('Failed to load game state:', e);
    }
    return null;
  };

  // Clear saved game state
  clearSavedState = () => {
    try {
      localStorage.removeItem('xiangqi_game_state');
    } catch (e) {
      console.error('Failed to clear saved state:', e);
    }
  };

  updateGameStatus = () => {
    if (!this.game) return;

    let status = '';
    const turn = this.game.turn === 'r' ? '红方' : '黑方';
    const turnEn = this.game.turn === 'r' ? 'Red' : 'Black';

    if (this.game.game_over()) {
      if (this.game.in_checkmate()) {
        const winner = this.game.turn === 'r' ? '黑方' : '红方';
        const winnerEn = this.game.turn === 'r' ? 'Black' : 'Red';
        status = `将死！${winner}获胜！/ Checkmate! ${winnerEn} wins!`;
      } else if (this.game.in_stalemate()) {
        status = '和棋（无子可动）/ Stalemate';
      } else {
        status = '游戏结束 / Game Over';
      }
      this.setState({ gameOver: true, gameStatus: status });
    } else {
      if (this.game.in_check()) {
        status = `${turn}被将军！/ ${turnEn} is in check!`;
      } else {
        status = `${turn}走棋 / ${turnEn} to move`;
      }
      this.setState({ gameOver: false, gameStatus: status });
    }
  };

  updateAnalysis = () => {
    if (!this.game || this.state.gameMode !== 'coach') return;

    const analysis = analyzePosition(this.game);
    // Always use highest depth for coach suggestions so advice is top quality
    // Pass move history so suggestions avoid repeating moves
    const history = this.game.history_moves();
    const suggestedMoves = getTopMoves(this.game, 3, 4, history);
    const strategicAdvice = getStrategicAdvice(this.game);

    this.setState({ analysis, suggestedMoves, strategicAdvice });
  };

  // Check for threats after AI moves (for coach mode)
  checkThreats = () => {
    if (!this.game || this.state.gameMode !== 'coach') return;
    if (this.state.gameOver) return;

    const threats = [];
    // Check if player is in check
    if (this.game.in_check()) {
      threats.push({ cn: '⚠️ 你被将军了！必须应将', en: 'You are in check! Must respond' });
      this.setState({ threatWarning: threats });
      return;
    }

    // Look at opponent's best moves to find threats
    const opponentMoves = this.game.moves({ verbose: true });
    const captureMoves = opponentMoves.filter(m => m.captured);

    // Check if any high-value pieces are under attack
    const valuePieces = { r: '车/Chariot', h: '马/Horse', c: '炮/Cannon' };
    const threatenedPieces = new Set();
    for (const m of captureMoves) {
      if (valuePieces[m.captured]) {
        threatenedPieces.add(valuePieces[m.captured]);
      }
    }
    for (const piece of threatenedPieces) {
      threats.push({ cn: `⚠️ 你的${piece.split('/')[0]}受到威胁`, en: `Your ${piece.split('/')[1]} is under attack` });
    }

    this.setState({ threatWarning: threats.length > 0 ? threats : null });
  };

  makeAIMove = () => {
    if (!this.game || this.state.gameOver || this.game.game_over()) return;
    if (this.game.turn === this.state.playerColor) return;

    this.setState({ aiThinking: true });

    setTimeout(() => {
      const bestMove = findBestMove(this.game, this.state.aiDifficulty);

      if (bestMove && this.game) {
        // Get explanation for coach mode
        let explanation = '';
        if (this.state.gameMode === 'coach') {
          explanation = explainAIMove(this.game, bestMove);
        }

        // Parse move positions for highlighting
        const fromPos = this.parsePosition(bestMove.from);
        const toPos = this.parsePosition(bestMove.to);

        this.game.move(bestMove);
        this.setState({
          fen: this.game.toFEN(),
          history: this.game.history_moves(),
          aiThinking: false,
          lastAIExplanation: explanation,
          validMoves: [],
          lastMove: fromPos && toPos ? {
            fromRow: fromPos.row,
            fromCol: fromPos.col,
            toRow: toPos.row,
            toCol: toPos.col,
          } : null,
        }, () => {
          // Save game state after AI move
          this.saveGameState();
        });
        this.updateGameStatus();

        // Update analysis based on mode (use setTimeout to avoid blocking UI)
        if (this.state.gameMode === 'coach') {
          setTimeout(() => {
            this.updateAnalysis();
            this.checkThreats();
          }, 50);
        } else if (this.state.gameMode === 'ai' && this.state.showCoachInAI) {
          this.updateAnalysisForAI();
        }
      } else {
        this.setState({ aiThinking: false });
      }
    }, 100);
  };

  parsePosition = (pos) => {
    if (!pos || pos.length < 2) return null;
    const col = pos.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 9 - parseInt(pos.slice(1));
    return { row, col };
  };

  handleSquareSelect = (row, col) => {
    if (!this.game || this.state.aiThinking || this.state.gameOver) {
      this.setState({ validMoves: [] });
      return;
    }

    // If deselecting (null passed)
    if (row === null || col === null) {
      this.setState({ validMoves: [] });
      return;
    }

    const { gameMode, playerColor } = this.state;
    const canSelectColor = gameMode === 'tutorial' ? 'r' : playerColor;

    // Check if it's player's turn
    if (gameMode !== 'tutorial' && this.game.turn !== canSelectColor) {
      this.setState({ validMoves: [] });
      return;
    }

    const piece = this.game.board[row][col];
    if (piece && piece.color === canSelectColor) {
      const moves = this.game.getValidMoves(row, col);
      this.setState({ validMoves: moves });
    } else {
      this.setState({ validMoves: [] });
    }
  };

  handleMove = (moveObj) => {
    if (!this.game || this.state.aiThinking) return;
    if (this.state.gameOver && this.state.gameMode !== 'tutorial') return;

    // Check if it's player's turn
    if (this.state.gameMode !== 'tutorial' && this.game.turn !== this.state.playerColor) {
      return;
    }

    const move = this.game.move(moveObj);
    if (!move) return;

    // Handle tutorial mode
    if (this.state.gameMode === 'tutorial') {
      this.checkTutorialMove(moveObj);
      this.setState({
        fen: this.game.toFEN(),
        validMoves: [],
      });
      return;
    }

    // Parse positions for last move highlighting
    const fromPos = this.parsePosition(moveObj.from);
    const toPos = this.parsePosition(moveObj.to);

    this.setState({
      fen: this.game.toFEN(),
      history: this.game.history_moves(),
      validMoves: [],
      lastAIExplanation: '',
      lastMove: fromPos && toPos ? {
        fromRow: fromPos.row,
        fromCol: fromPos.col,
        toRow: toPos.row,
        toCol: toPos.col,
      } : null,
    }, () => {
      // Save game state after player move
      this.saveGameState();
    });
    this.updateGameStatus();

    if (this.state.gameMode === 'ai' || this.state.gameMode === 'coach') {
      setTimeout(() => this.makeAIMove(), 300);
    }

    // Coach analysis updates after AI move (inside makeAIMove), not here

    // Update analysis for AI mode with coach hints
    if (this.state.gameMode === 'ai' && this.state.showCoachInAI) {
      setTimeout(() => this.updateAnalysisForAI(), 100);
    }
  };

  resetGame = () => {
    if (!this.game) return;
    this.game.reset();
    clearCache();
    resetPositionHistory();

    // Clear saved state when starting new game
    this.clearSavedState();

    this.setState({
      fen: this.game.toFEN(),
      history: [],
      gameOver: false,
      aiThinking: false,
      validMoves: [],
      lastMove: null,
      lastAIExplanation: '',
      analysis: null,
      suggestedMoves: [],
      threatWarning: null,
    });
    this.updateGameStatus();

    if (this.state.gameMode === 'coach') {
      setTimeout(() => this.updateAnalysis(), 100);
    }

    if ((this.state.gameMode === 'ai' || this.state.gameMode === 'coach') && this.state.playerColor === 'b') {
      setTimeout(() => this.makeAIMove(), 500);
    }
  };

  undoMove = () => {
    if (!this.game || this.state.history.length === 0 || this.state.aiThinking) return;

    const isAIMode = this.state.gameMode === 'ai' || this.state.gameMode === 'coach';

    // In AI mode, we want to land on the player's turn after undo.
    // Check the last move color to decide how many moves to undo.
    if (isAIMode) {
      const lastMoveColor = this.game.moveHistory[this.game.moveHistory.length - 1]?.color;

      if (lastMoveColor === this.state.playerColor) {
        // Last move was by the player (e.g. game ended on player's winning move,
        // or player just moved and AI hasn't replied yet) — undo 1 move
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
    let newStatus = '';
    const turn = this.game.turn === 'r' ? '红方' : '黑方';
    const turnEn = this.game.turn === 'r' ? 'Red' : 'Black';
    if (isGameOver) {
      if (this.game.in_checkmate()) {
        const winner = this.game.turn === 'r' ? '黑方' : '红方';
        const winnerEn = this.game.turn === 'r' ? 'Black' : 'Red';
        newStatus = `将死！${winner}获胜！/ Checkmate! ${winnerEn} wins!`;
      } else {
        newStatus = '游戏结束 / Game Over';
      }
    } else if (this.game.in_check()) {
      newStatus = `${turn}被将军！/ ${turnEn} is in check!`;
    } else {
      newStatus = `${turn}走棋 / ${turnEn} to move`;
    }

    this.setState({
      fen: this.game.toFEN(),
      history: this.game.history_moves(),
      validMoves: [],
      lastMove: null,
      gameOver: isGameOver,
      gameStatus: newStatus,
    }, () => {
      // Save game state after undo
      this.saveGameState();

      // After undo, if it's the AI's turn, trigger AI move
      if (isAIMode && !isGameOver && this.game.turn !== this.state.playerColor) {
        setTimeout(() => this.makeAIMove(), 300);
      }

      if (this.state.gameMode === 'coach' && !isGameOver) {
        setTimeout(() => this.updateAnalysis(), 100);
      }
    });
  };

  // Tutorial methods
  startTutorial = (lessonIndex = 0) => {
    const lesson = XIANGQI_LESSONS[lessonIndex];
    if (!lesson || !this.game) return;

    this.game.loadFEN(lesson.fen);
    this.game.turn = 'r'; // Red always starts in tutorials

    this.setState({
      gameMode: 'tutorial',
      currentLesson: lessonIndex,
      fen: this.game.toFEN(),
      history: [],
      gameOver: false,
      lessonComplete: false,
      showTutorialHint: false,
      validMoves: [],
      lastMove: null,
      gameStatus: lesson.objective,
    });
  };

  nextLesson = () => {
    const nextIndex = this.state.currentLesson + 1;
    if (nextIndex < XIANGQI_LESSONS.length) {
      this.startTutorial(nextIndex);
    }
  };

  prevLesson = () => {
    const prevIndex = this.state.currentLesson - 1;
    if (prevIndex >= 0) {
      this.startTutorial(prevIndex);
    }
  };

  checkTutorialMove = (moveObj) => {
    const lesson = XIANGQI_LESSONS[this.state.currentLesson];
    if (!lesson) return false;

    const moveStr = `${moveObj.from}-${moveObj.to}`;
    const isCorrect = lesson.correctMoves.includes(moveStr);

    if (isCorrect) {
      const progress = [...this.state.tutorialProgress];
      if (!progress.includes(lesson.id)) {
        progress.push(lesson.id);
        localStorage.setItem('xiangqi_tutorial_progress', JSON.stringify(progress));
      }
      this.setState({
        lessonComplete: true,
        tutorialProgress: progress,
        gameStatus: '正确！/ Correct!',
      });
    } else {
      this.game.undo();
      this.setState({
        fen: this.game.toFEN(),
        gameStatus: '再试一次 / Try again',
      });
    }

    return isCorrect;
  };

  toggleTutorialHint = () => {
    this.setState(state => ({ showTutorialHint: !state.showTutorialHint }));
  };

  setGameMode = (mode) => {
    if (mode === 'tutorial') {
      this.startTutorial(0);
      return;
    }
    // Coach mode defaults to level 2 (初级) for a good learning experience
    const newDifficulty = mode === 'coach' ? 2 : this.state.aiDifficulty;
    this.setState({ gameMode: mode, aiDifficulty: newDifficulty }, () => {
      this.resetGame();
    });
  };

  setPlayerColor = (color) => {
    this.setState({ playerColor: color }, () => {
      this.resetGame();
    });
  };

  setDifficulty = (level) => {
    this.setState({ aiDifficulty: level }, () => {
      // Save immediately so difficulty persists
      this.saveGameState();
      // Re-run coach analysis with new difficulty
      if (this.state.gameMode === 'coach') {
        this.updateAnalysis();
      }
    });
  };

  toggleHints = () => {
    this.setState(state => ({ showHints: !state.showHints }), () => {
      if (this.state.showHints) {
        this.updateAnalysis();
      }
    });
  };

  // Toggle coach hints in AI mode
  toggleCoachInAI = () => {
    this.setState(state => ({ showCoachInAI: !state.showCoachInAI }), () => {
      if (this.state.showCoachInAI) {
        this.updateAnalysisForAI();
      }
    });
  };

  // Update analysis for AI mode (on demand)
  updateAnalysisForAI = () => {
    if (!this.game) return;

    const analysis = analyzePosition(this.game);
    const suggestedMoves = getTopMoves(this.game, 3, Math.max(this.state.aiDifficulty, 3));
    const strategicAdvice = getStrategicAdvice(this.game);

    this.setState({ analysis, suggestedMoves, strategicAdvice });
  };

  render() {
    const {
      fen, gameStatus, gameOver, history,
      gameMode, playerColor, aiThinking, aiDifficulty,
      analysis, suggestedMoves, strategicAdvice, showHints, lastAIExplanation,
      threatWarning,
      currentLesson, lessonComplete, showTutorialHint, tutorialProgress,
      validMoves, lastMove,
    } = this.state;

    const currentTutorialLesson = XIANGQI_LESSONS[currentLesson];
    const boardOrientation = (gameMode === 'ai' || gameMode === 'coach') && playerColor === 'b' ? 'black' : 'red';

    return (
      <div className="xiangqi-game-layout">
        {/* Left Panel - Settings */}
        <div className="settings-panel xiangqi-settings">
          <div className="panel-title">中国象棋 / Chinese Chess</div>

          {/* Game Mode */}
          <div className="settings-section">
            <div className="section-label">游戏模式 / Game Mode</div>
            <div className="mode-selector-vertical">
              <button
                className={`mode-btn ${gameMode === 'ai' ? 'active' : ''}`}
                onClick={() => this.setGameMode('ai')}
              >
                AI 对战
              </button>
              <button
                className={`mode-btn ${gameMode === 'coach' ? 'active' : ''}`}
                onClick={() => this.setGameMode('coach')}
              >
                教练模式
              </button>
              <button
                className={`mode-btn ${gameMode === 'tutorial' ? 'active' : ''}`}
                onClick={() => this.setGameMode('tutorial')}
              >
                新手教程
              </button>
            </div>
          </div>

          {/* AI/Coach Options */}
          {(gameMode === 'ai' || gameMode === 'coach') && (
            <>
              <div className="settings-section">
                <div className="section-label">执棋方 / Play as</div>
                <div className="color-selector-vertical">
                  <button
                    className={`color-btn xiangqi-red ${playerColor === 'r' ? 'active' : ''}`}
                    onClick={() => this.setPlayerColor('r')}
                  >
                    红方 Red
                  </button>
                  <button
                    className={`color-btn xiangqi-black ${playerColor === 'b' ? 'active' : ''}`}
                    onClick={() => this.setPlayerColor('b')}
                  >
                    黑方 Black
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <div className="section-label">AI 难度 / Difficulty</div>
                <div className="difficulty-selector-vertical">
                  {[1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      className={`diff-btn ${aiDifficulty === level ? 'active' : ''}`}
                      onClick={() => this.setDifficulty(level)}
                    >
                      {level === 1 ? '入门' : level === 2 ? '初级' : level === 3 ? '中级' : '高级'}
                    </button>
                  ))}
                </div>
              </div>

              {gameMode === 'coach' && (
                <div className="settings-section">
                  <div className="section-label">显示提示 / Show Hints</div>
                  <button
                    className={`toggle-btn ${showHints ? 'active' : ''}`}
                    onClick={this.toggleHints}
                  >
                    {showHints ? '已开启' : '已关闭'}
                  </button>
                </div>
              )}

              {gameMode === 'ai' && (
                <div className="settings-section">
                  <div className="section-label">教练提示 / Coach Hints</div>
                  <button
                    className={`toggle-btn coach-hint-btn ${this.state.showCoachInAI ? 'active' : ''}`}
                    onClick={this.toggleCoachInAI}
                  >
                    {this.state.showCoachInAI ? '💡 已开启' : '💡 获取提示'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Game Controls */}
          {gameMode !== 'tutorial' && (
            <div className="settings-section controls-section">
              <button className="btn btn-primary full-width" onClick={this.resetGame}>
                新局 / New Game
              </button>
              <button
                className="btn btn-secondary full-width"
                onClick={this.undoMove}
                disabled={history.length === 0 || aiThinking}
              >
                悔棋 / Undo
              </button>
            </div>
          )}
        </div>

        {/* Center Panel - Board */}
        <div className="board-panel xiangqi-board-panel">
          <div className={`game-status ${gameOver ? 'game-over' : ''} ${aiThinking ? 'thinking' : ''}`}>
            {aiThinking ? 'AI 思考中... / AI thinking...' : gameStatus}
          </div>

          <div className="xiangqi-board-wrapper">
            {this.game && (
              <XiangqiBoard
                board={this.game.board}
                width={450}
                orientation={boardOrientation}
                turn={this.game.turn}
                playerColor={gameMode === 'tutorial' ? 'r' : playerColor}
                validMoves={validMoves}
                lastMove={lastMove}
                onMove={this.handleMove}
                onSquareSelect={this.handleSquareSelect}
                disabled={aiThinking || (gameOver && gameMode !== 'tutorial') || (gameMode === 'tutorial' && lessonComplete)}
              />
            )}
          </div>

          {/* Move History */}
          {gameMode !== 'tutorial' && (
            <div className="move-history xiangqi-history">
              <h3>走法记录 / Move History</h3>
              <div className="moves-list">
                {history.length === 0 ? (
                  <span className="no-moves">暂无走法</span>
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

        {/* Right Panel - Analysis (Coach Mode or AI with hints) */}
        {(gameMode === 'coach' || (gameMode === 'ai' && this.state.showCoachInAI)) && (
          <div className="analysis-panel-right xiangqi-analysis">
            <div className="panel-title">{gameMode === 'coach' ? 'AI 分析' : '💡 教练提示'}</div>

            {/* Win Probability */}
            {analysis && (
              <div className="analysis-section">
                <div className="section-label">胜率 / Win Probability</div>
                <div className="win-probability">
                  <div className="prob-bar">
                    <div
                      className="prob-red"
                      style={{ width: `${analysis.winProbability.red * 100}%` }}
                    >
                      {analysis.winProbability.red >= 0.15 && (
                        <span>{Math.round(analysis.winProbability.red * 100)}%</span>
                      )}
                    </div>
                    <div
                      className="prob-black-xiangqi"
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

            {/* Threat Warnings */}
            {threatWarning && threatWarning.length > 0 && !aiThinking && (
              <div className="analysis-section threat-section">
                <div className="section-label">⚠️ 注意威胁 / Watch Out</div>
                {threatWarning.map((t, i) => (
                  <div key={i} className="threat-item">
                    <p>{t.cn}</p>
                    <p className="threat-en">{t.en}</p>
                  </div>
                ))}
              </div>
            )}

            {/* AI Explanation */}
            {lastAIExplanation && (
              <div className="analysis-section">
                <div className="section-label">AI 走法说明</div>
                <div className="ai-explanation-box">
                  {lastAIExplanation}
                </div>
              </div>
            )}

            {/* Suggested Moves */}
            {suggestedMoves.length > 0 && !aiThinking && this.game && this.game.turn === playerColor && (
              <div className="analysis-section">
                <div className="section-label">推荐走法 / Suggested Moves</div>
                <div className="suggested-moves-list">
                  {suggestedMoves.map((item, index) => (
                    <div
                      key={index}
                      className={`suggestion ${index === 0 ? 'best' : ''}`}
                      onClick={() => this.handleMove(item.move)}
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
                <div className="section-label">战略建议 / Strategic Advice</div>
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
          </div>
        )}

        {/* Right Panel - Tutorial */}
        {gameMode === 'tutorial' && currentTutorialLesson && (
          <div className="tutorial-panel-right xiangqi-tutorial">
            <div className="panel-title">象棋教程 / Tutorial</div>

            {/* Progress */}
            <div className="tutorial-progress">
              <div className="progress-text">
                第 {currentLesson + 1} 课 / {XIANGQI_LESSONS.length}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${((currentLesson + 1) / XIANGQI_LESSONS.length) * 100}%` }}
                />
              </div>
              <div className="completed-text">
                已完成 {tutorialProgress.length} 课
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
                <strong>目标 / Objective:</strong>
                <p>{currentTutorialLesson.objective}</p>
                <p className="objective-en">{currentTutorialLesson.objectiveEn}</p>
              </div>

              {/* Hint */}
              <div className="lesson-hint-section">
                <button
                  className="hint-toggle-btn"
                  onClick={this.toggleTutorialHint}
                >
                  {showTutorialHint ? '隐藏提示' : '显示提示'}
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
                  <div className="complete-icon">!</div>
                  <p>恭喜！课程完成！</p>
                  <p>Congratulations!</p>
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
                上一课
              </button>
              <button
                className="btn btn-primary"
                onClick={() => this.startTutorial(currentLesson)}
              >
                重试
              </button>
              <button
                className="btn btn-primary"
                onClick={this.nextLesson}
                disabled={currentLesson >= XIANGQI_LESSONS.length - 1}
              >
                下一课
              </button>
            </div>

            {/* Lesson List */}
            <div className="tutorial-lessons-list">
              <div className="section-label">全部课程</div>
              <div className="lessons-grid">
                {XIANGQI_LESSONS.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    className={`lesson-item ${currentLesson === index ? 'active' : ''} ${tutorialProgress.includes(lesson.id) ? 'completed' : ''}`}
                    onClick={() => this.startTutorial(index)}
                  >
                    <span className="lesson-num">{index + 1}</span>
                    {tutorialProgress.includes(lesson.id) && <span className="check">!</span>}
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

export default XiangqiGame;
