/**
 * WuziQiGame — Full game page component for 五子棋 (Gomoku / Five-in-a-Row)
 *
 * Features:
 *  - Play vs AI at 4 difficulty levels
 *  - Play vs Human (local)
 *  - Undo, New Game, ELO rating
 *  - Move history display
 */

import React, { Component } from 'react';
import WuziQi, { BOARD_SIZE, EMPTY, BLACK, WHITE } from './wuziqi';
import WuziQiBoard from './WuziQiBoard';
import { findBestMoveWuziQi, analyzeWuziQiPosition } from './WuziQiAI';
import { getRating, recordResult } from './services/UserRatingService';
import { GAME_TYPE, DIFFICULTY, DIFFICULTY_LABEL, RESULT } from './constants';
import { RatingDisplay } from './components/RatingDisplay';
import { GameResultDialog } from './components/GameResultDialog';
import './WuziQiGame.css';

const MODE = {
  VS_AI: 'vsAI',
  VS_HUMAN: 'vsHuman',
};

class WuziQiGame extends Component {
  constructor(props) {
    super(props);
    this.game = new WuziQi();
    this.state = {
      board: this.game.board.map(r => [...r]),
      turn: BLACK,
      gameOver: false,
      winner: null,
      lastMove: null,
      winLine: null,
      moveCount: 0,
      // Settings
      mode: MODE.VS_AI,
      difficulty: DIFFICULTY.MEDIUM,
      playerColor: BLACK, // human plays black (first)
      // AI
      aiThinking: false,
      // Rating
      ratingData: getRating(GAME_TYPE.WUZIQI),
      showResult: false,
      resultMessage: '',
      resultType: null,
      oldRating: null,
      newRating: null,
      // Analysis
      analysis: null,
      // AI Hint
      hintMove: null,
    };
  }

  componentDidMount() {
    // If player chose white, AI goes first
    if (this.state.mode === MODE.VS_AI && this.state.playerColor === WHITE) {
      this.doAIMove();
    }
  }

  syncState = () => {
    this.setState({
      board: this.game.board.map(r => [...r]),
      turn: this.game.turn,
      gameOver: this.game.gameOver,
      winner: this.game.winner,
      lastMove: this.game.lastMove,
      moveCount: this.game.moveHistory.length,
    });
  };

  handleCellClick = (row, col) => {
    if (this.state.gameOver || this.state.aiThinking) return;

    const { mode, playerColor } = this.state;

    // In vs AI mode, only allow player's color
    if (mode === MODE.VS_AI && this.game.turn !== playerColor) return;

    const ok = this.game.place(row, col);
    if (!ok) return;

    // Clear hint on move
    this.setState({ hintMove: null });

    // Check for win line
    if (this.game.gameOver && this.game.winner) {
      const winLine = this.findWinLine(row, col, this.game.winner);
      this.setState({ winLine }, () => {
        this.syncState();
        this.handleGameEnd();
      });
      return;
    }

    this.syncState();

    // Trigger AI move in vs AI mode after a delay
    if (mode === MODE.VS_AI && !this.game.gameOver) {
      this.doAIMove();
    }
  };

  doAIMove = () => {
    this.setState({ aiThinking: true });
    setTimeout(() => {
      const move = findBestMoveWuziQi(this.game, this.state.difficulty);
      if (move) {
        this.game.place(move.row, move.col);

        if (this.game.gameOver && this.game.winner) {
          const winLine = this.findWinLine(move.row, move.col, this.game.winner);
          this.setState({ winLine, aiThinking: false }, () => {
            this.syncState();
            this.handleGameEnd();
          });
          return;
        }

        this.setState({ aiThinking: false });
        this.syncState();
      } else {
        this.setState({ aiThinking: false });
      }
    }, 300);
  };

  /**
   * Find the 5+ stones that form the winning line.
   */
  findWinLine(row, col, color) {
    const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of DIRS) {
      const line = [{ row, col }];
      // Positive
      for (let i = 1; i < 5; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.game.board[nr][nc] === color) {
          line.push({ row: nr, col: nc });
        } else break;
      }
      // Negative
      for (let i = 1; i < 5; i++) {
        const nr = row - dr * i;
        const nc = col - dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && this.game.board[nr][nc] === color) {
          line.push({ row: nr, col: nc });
        } else break;
      }
      if (line.length >= 5) return line;
    }
    return null;
  }

  handleGameEnd = async () => {
    const { winner } = this.game;
    const { mode, playerColor, difficulty } = this.state;
    const oldRating = this.state.ratingData.rating;

    let resultType, resultMessage;

    if (!winner) {
      resultType = RESULT.DRAW;
      resultMessage = 'Draw! 平局！';
    } else if (mode === MODE.VS_HUMAN) {
      resultType = RESULT.WIN;
      resultMessage = winner === BLACK
        ? '⚫ Black wins! 黑方获胜！'
        : '⚪ White wins! 白方获胜！';
    } else {
      if (winner === playerColor) {
        resultType = RESULT.WIN;
        resultMessage = '🎉 You win! 你赢了！';
      } else {
        resultType = RESULT.LOSS;
        resultMessage = '😔 You lost! 你输了！';
      }
    }

    // Record ELO
    if (mode === MODE.VS_AI) {
      try {
        const { newRating } = await recordResult({
          gameType: GAME_TYPE.WUZIQI,
          result: resultType,
          difficulty,
        });

        this.setState({
          showResult: true,
          resultMessage,
          resultType,
          oldRating,
          newRating,
          ratingData: getRating(GAME_TYPE.WUZIQI),
        });
      } catch (err) {
        this.setState({
          showResult: true,
          resultMessage,
          resultType,
          oldRating,
          newRating: oldRating,
        });
      }
    } else {
      this.setState({
        showResult: true,
        resultMessage,
        resultType,
        oldRating,
        newRating: oldRating,
      });
    }
  };

  handleNewGame = () => {
    this.game.reset();
    this.setState({
      winLine: null,
      showResult: false,
      resultMessage: '',
      resultType: null,
      oldRating: null,
      newRating: null,
      analysis: null,
      aiThinking: false,
      ratingData: getRating(GAME_TYPE.WUZIQI),
    }, () => {
      this.syncState();
      if (this.state.mode === MODE.VS_AI && this.state.playerColor === WHITE) {
        this.doAIMove();
      }
    });
  };

  handleUndo = () => {
    if (this.state.aiThinking || this.game.moveHistory.length === 0) return;

    if (this.state.mode === MODE.VS_AI) {
      // Undo two moves (player + AI)
      this.game.undo();
      this.game.undo();
    } else {
      this.game.undo();
    }

    this.setState({ winLine: null, analysis: null });
    this.syncState();
  };

  handleAnalyze = () => {
    const analysis = analyzeWuziQiPosition(this.game);
    this.setState({ analysis });
  };

  handleHint = () => {
    if (this.state.gameOver || this.state.aiThinking) return;
    // Use the AI to find the best move for the current player
    const bestMove = findBestMoveWuziQi(this.game, 3); // Use hard difficulty for hints
    if (bestMove) {
      this.setState({ hintMove: bestMove });
      // Auto-clear hint after 5 seconds
      setTimeout(() => this.setState({ hintMove: null }), 5000);
    }
  };

  setDifficulty = (diff) => {
    this.setState({ difficulty: diff }, this.handleNewGame);
  };

  setMode = (mode) => {
    this.setState({ mode }, this.handleNewGame);
  };

  setPlayerColor = (color) => {
    this.setState({ playerColor: color }, this.handleNewGame);
  };

  render() {
    const {
      board, turn, gameOver, lastMove, winLine, moveCount,
      mode, difficulty, playerColor, aiThinking,
      ratingData, showResult, resultMessage, resultType, oldRating, newRating,
      analysis, hintMove,
    } = this.state;

    const turnLabel = turn === BLACK ? '⚫ Black' : '⚪ White';
    const isPlayerTurn = mode === MODE.VS_HUMAN || turn === playerColor;

    return (
      <div className="wuziqi-game">
        {/* Header */}
        <div className="wuziqi-header">
          <h2>五子棋 · Gomoku</h2>
          <p className="wuziqi-subtitle">Five in a Row</p>
        </div>

        <div className="wuziqi-layout">
          {/* Left Panel: Controls */}
          <div className="wuziqi-panel wuziqi-left-panel">
            {/* Rating */}
            <div className="wuziqi-section">
              <RatingDisplay gameType={GAME_TYPE.WUZIQI} />
            </div>

            {/* Mode Selection */}
            <div className="wuziqi-section">
              <h4>Mode</h4>
              <div className="wuziqi-btn-group">
                <button
                  className={`wuziqi-btn ${mode === MODE.VS_AI ? 'active' : ''}`}
                  onClick={() => this.setMode(MODE.VS_AI)}
                >
                  🤖 vs AI
                </button>
                <button
                  className={`wuziqi-btn ${mode === MODE.VS_HUMAN ? 'active' : ''}`}
                  onClick={() => this.setMode(MODE.VS_HUMAN)}
                >
                  👤 vs Human
                </button>
              </div>
            </div>

            {/* Difficulty */}
            {mode === MODE.VS_AI && (
              <div className="wuziqi-section">
                <h4>Difficulty</h4>
                <div className="wuziqi-btn-group vertical">
                  {Object.entries(DIFFICULTY).map(([key, val]) => (
                    <button
                      key={key}
                      className={`wuziqi-btn ${difficulty === val ? 'active' : ''}`}
                      onClick={() => this.setDifficulty(val)}
                    >
                      {DIFFICULTY_LABEL[val]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Player Color */}
            {mode === MODE.VS_AI && (
              <div className="wuziqi-section">
                <h4>Play As</h4>
                <div className="wuziqi-btn-group">
                  <button
                    className={`wuziqi-btn ${playerColor === BLACK ? 'active' : ''}`}
                    onClick={() => this.setPlayerColor(BLACK)}
                  >
                    ⚫ Black (First)
                  </button>
                  <button
                    className={`wuziqi-btn ${playerColor === WHITE ? 'active' : ''}`}
                    onClick={() => this.setPlayerColor(WHITE)}
                  >
                    ⚪ White
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="wuziqi-section">
              <div className="wuziqi-btn-group vertical">
                <button className="wuziqi-btn action" onClick={this.handleNewGame}>🔄 New Game</button>
                <button
                  className="wuziqi-btn action"
                  onClick={this.handleUndo}
                  disabled={aiThinking || moveCount === 0}
                >
                  ↩️ Undo
                </button>
                <button className="wuziqi-btn action" onClick={this.handleAnalyze}>
                  📊 Analyze
                </button>
                <button
                  className="wuziqi-btn action hint-btn"
                  onClick={this.handleHint}
                  disabled={aiThinking || gameOver}
                >
                  💡 Hint
                </button>
              </div>
            </div>
          </div>

          {/* Center: Board */}
          <div className="wuziqi-board-container">
            {/* Status bar */}
            <div className="wuziqi-status">
              {gameOver ? (
                <span className="status-text game-over">
                  {this.state.resultMessage || 'Game Over'}
                </span>
              ) : aiThinking ? (
                <span className="status-text thinking">🤔 AI is thinking...</span>
              ) : (
                <span className="status-text">
                  {turnLabel}'s turn · Move {moveCount + 1}
                  {mode === MODE.VS_AI && isPlayerTurn && ' (Your turn)'}
                </span>
              )}
            </div>

            <WuziQiBoard
              board={board}
              lastMove={lastMove}
              winLine={winLine}
              hintMove={hintMove}
              onCellClick={this.handleCellClick}
              disabled={gameOver || aiThinking || !isPlayerTurn}
            />
          </div>

          {/* Right Panel: Info */}
          <div className="wuziqi-panel wuziqi-right-panel">
            {/* Move History */}
            <div className="wuziqi-section">
              <h4>Moves ({moveCount})</h4>
              <div className="wuziqi-move-list">
                {this.game.moveHistory.map((m, i) => {
                  const colLabel = String.fromCharCode(65 + m.col);
                  const rowLabel = BOARD_SIZE - m.row;
                  return (
                    <span key={i} className={`move-entry ${m.color === BLACK ? 'black-move' : 'white-move'}`}>
                      {i + 1}. {m.color === BLACK ? '⚫' : '⚪'}{colLabel}{rowLabel}
                    </span>
                  );
                })}
                {moveCount === 0 && (
                  <span className="move-entry empty">No moves yet</span>
                )}
              </div>
            </div>

            {/* Analysis */}
            {analysis && (
              <div className="wuziqi-section analysis-section">
                <h4>📊 Analysis</h4>
                <p>{analysis.advantage.en}</p>
                <p>{analysis.advantage.cn}</p>
                <div className="score-bar">
                  <span>⚫ {analysis.blackScore}</span>
                  <span>⚪ {analysis.whiteScore}</span>
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="wuziqi-section rules-section">
              <h4>📖 Rules 规则</h4>
              <ul>
                <li>Black moves first 黑先行</li>
                <li>Place stones on intersections 落子在交叉点</li>
                <li>5 in a row wins 五子连珠获胜</li>
                <li>Horizontal, vertical, or diagonal 横竖斜均可</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Result Dialog */}
        <GameResultDialog
          isOpen={showResult}
          result={resultType}
          message={resultMessage}
          oldRating={oldRating}
          newRating={newRating}
          gameType="wuziqi"
          opponent={mode === MODE.VS_AI ? `AI (${DIFFICULTY_LABEL[difficulty]})` : 'Human'}
          moves={moveCount}
          onRematch={this.handleNewGame}
          onReview={() => this.setState({ showResult: false })}
          onHome={() => this.setState({ showResult: false })}
          onClose={() => this.setState({ showResult: false })}
        />
      </div>
    );
  }
}

export default WuziQiGame;
