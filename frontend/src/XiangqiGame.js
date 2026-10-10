/**
 * Xiangqi Game Component
 * 中国象棋游戏组件 - 支持AI对战、教练模式、教程模式
 */

import React, { Component } from 'react';
import Xiangqi, { PIECE_NAMES } from './xiangqi';
import XiangqiBoard from './XiangqiBoard';
import XIANGQI_LESSONS from './xiangqiLessons';
import { getBoardWidth } from './boardSize';
import {
  findBestMove,
  getTopMoves,
  analyzePosition,
  getStrategicAdvice,
  explainAIMove,
  quickEvaluate,
  clearCache,
} from './XiangqiAI';

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
    coachThinking: false,
    boardWidth: getBoardWidth(450, 24),
    notice: null, // transient explanation shown under the status bar
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
  analysisToken = 0;

  handleResize = () => {
    const boardWidth = getBoardWidth(450, 24);
    if (boardWidth !== this.state.boardWidth) this.setState({ boardWidth });
  };

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
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
    window.removeEventListener('resize', this.handleResize);
    clearTimeout(this.noticeTimer);
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
        // In xiangqi a side with no legal move loses
        const winner = this.game.turn === 'r' ? '黑方' : '红方';
        const winnerEn = this.game.turn === 'r' ? 'Black' : 'Red';
        status = `无子可动！${winner}获胜！/ No legal moves! ${winnerEn} wins!`;
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

  // Compute suggestions only when it is the player's turn (the search is the
  // slow part). The panel only shows them on the player's turn anyway.
  computeAnalysis = (minDifficulty = 0) => {
    if (!this.game) return;

    const analysis = analyzePosition(this.game);
    const strategicAdvice = getStrategicAdvice(this.game);

    if (this.game.turn !== this.state.playerColor || this.state.gameOver) {
      this.analysisToken++;
      this.setState({ analysis, suggestedMoves: [], strategicAdvice, coachThinking: false });
      return;
    }

    // Let the "thinking" label paint before the synchronous search starts
    this.setState({ analysis, strategicAdvice, coachThinking: true });
    const fen = this.game.toFEN();
    const token = ++this.analysisToken;
    setTimeout(() => {
      if (token !== this.analysisToken) return; // a newer analysis owns the flag
      if (!this.game) return; // unmounted
      if (this.game.toFEN() !== fen) {
        this.setState({ coachThinking: false }); // position changed meanwhile
        return;
      }
      const suggestedMoves = getTopMoves(this.game, 3, Math.max(this.state.aiDifficulty, minDifficulty));
      this.setState({ suggestedMoves, coachThinking: false });
    }, 30);
  };

  updateAnalysis = () => {
    if (this.state.gameMode !== 'coach') return;
    this.computeAnalysis();
  };

  makeAIMove = () => {
    if (!this.game || this.state.gameOver) return;
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

        // Update analysis based on mode
        if (this.state.gameMode === 'coach') {
          this.updateAnalysis();
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

  showNotice = (message) => {
    if (!message) return;
    clearTimeout(this.noticeTimer);
    this.setState({ notice: message });
    this.noticeTimer = setTimeout(() => this.setState({ notice: null }), 4000);
  };

  handleIllegalMove = (from, to) => {
    if (!this.game || this.state.aiThinking || this.state.gameOver) return;
    this.showNotice(this.game.explainIllegalMove(from.row, from.col, to.row, to.col));
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
      if (moves.length === 0) {
        this.showNotice({
          zh: '这个棋子现在无法移动（被挡住，或移动会让将帅被将军/照面）',
          en: 'This piece cannot move right now (blocked, or it would expose your general)',
        });
      }
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
    if (this.state.notice) this.setState({ notice: null });

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

    if (this.state.gameMode === 'coach') {
      setTimeout(() => this.updateAnalysis(), 100);
    }

    // Update analysis for AI mode with coach hints
    if (this.state.gameMode === 'ai' && this.state.showCoachInAI) {
      setTimeout(() => this.updateAnalysisForAI(), 100);
    }
  };

  resetGame = () => {
    if (!this.game) return;
    this.game.reset();
    clearCache();

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

    // Undo two moves in AI mode (player's and AI's)
    if ((this.state.gameMode === 'ai' || this.state.gameMode === 'coach') && this.state.history.length >= 2) {
      this.game.undo();
      this.game.undo();
    } else {
      this.game.undo();
    }

    this.setState({
      fen: this.game.toFEN(),
      history: this.game.history_moves(),
      validMoves: [],
      lastMove: null,
      gameOver: false,
    }, () => {
      // Save game state after undo
      this.saveGameState();
    });
    this.updateGameStatus();

    if (this.state.gameMode === 'coach') {
      setTimeout(() => this.updateAnalysis(), 100);
    }
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
        gameStatus: '这步合法，但不是本课的目标，再试一次 / Legal, but not the goal of this lesson — try again',
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
    // Coach mode uses highest AI difficulty by default for best guidance
    const newDifficulty = mode === 'coach' ? 4 : this.state.aiDifficulty;
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
    this.setState({ aiDifficulty: level });
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
    this.computeAnalysis(3);
  };

  render() {
    const {
      fen, gameStatus, gameOver, history,
      gameMode, playerColor, aiThinking, aiDifficulty,
      analysis, suggestedMoves, strategicAdvice, showHints, lastAIExplanation,
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

          {this.state.notice && (
            <div className="xiangqi-notice" role="status">
              <span>{this.state.notice.zh}</span>
              <span className="xiangqi-notice-en">{this.state.notice.en}</span>
            </div>
          )}

          <div className="xiangqi-board-wrapper">
            {this.game && (
              <XiangqiBoard
                board={this.game.board}
                width={this.state.boardWidth}
                orientation={boardOrientation}
                turn={this.game.turn}
                playerColor={gameMode === 'tutorial' ? 'r' : playerColor}
                validMoves={validMoves}
                lastMove={lastMove}
                onMove={this.handleMove}
                onSquareSelect={this.handleSquareSelect}
                onIllegalMove={this.handleIllegalMove}
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

            {/* AI Explanation */}
            {lastAIExplanation && (
              <div className="analysis-section">
                <div className="section-label">AI 走法说明</div>
                <div className="ai-explanation-box">
                  {lastAIExplanation}
                </div>
              </div>
            )}

            {this.state.coachThinking && (
              <div className="analysis-section">
                <div className="section-label">教练思考中... / Coach thinking...</div>
              </div>
            )}

            {/* Suggested Moves */}
            {suggestedMoves.length > 0 && !this.state.coachThinking && !aiThinking && this.game && this.game.turn === playerColor && (
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
