/**
 * Game Review Component
 * Displays AI-powered analysis of chess games
 */

import React, { Component } from 'react';
import Chessboard from 'chessboardjsx';
import { getAnalysisService } from './services/ChessAnalysisService';
import './GameReview.css';

class GameReview extends Component {
  state = {
    // Analysis state
    isAnalyzing: false,
    analysisProgress: 0,
    analysisTotal: 0,
    analysis: null,
    error: null,
    
    // Playback state
    currentMoveIndex: -1,
    currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    
    // UI state
    showEvalBar: true,
    autoPlay: false,
  };

  analysisService = null;
  autoPlayInterval = null;

  componentDidMount() {
    this.analysisService = getAnalysisService();
    
    // If game data is provided, start analysis
    if (this.props.game) {
      this.analyzeGame(this.props.game);
    }
  }

  componentWillUnmount() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  /**
   * Analyze a game
   */
  async analyzeGame(game) {
    if (!game || !game.moves || game.moves.length === 0) {
      this.setState({ error: 'No moves to analyze' });
      return;
    }

    this.setState({
      isAnalyzing: true,
      analysisProgress: 0,
      analysisTotal: game.moves.length,
      error: null,
    });

    try {
      const analysis = await this.analysisService.analyzeGame(
        game.moves,
        (progress, total) => {
          this.setState({ analysisProgress: progress, analysisTotal: total });
        }
      );

      this.setState({
        isAnalyzing: false,
        analysis,
        currentMoveIndex: -1,
        currentFen: game.startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      this.setState({
        isAnalyzing: false,
        error: 'Analysis failed: ' + error.message,
      });
    }
  }

  /**
   * Navigate to a specific move
   */
  goToMove = (index) => {
    const { analysis } = this.state;
    if (!analysis || !analysis.moves) return;

    if (index < -1) index = -1;
    if (index >= analysis.moves.length) index = analysis.moves.length - 1;

    const fen = index === -1 
      ? (this.props.game?.startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      : analysis.moves[index].fenAfter;

    this.setState({ currentMoveIndex: index, currentFen: fen });
  };

  goToStart = () => this.goToMove(-1);
  goToPrev = () => this.goToMove(this.state.currentMoveIndex - 1);
  goToNext = () => this.goToMove(this.state.currentMoveIndex + 1);
  goToEnd = () => this.goToMove(this.state.analysis?.moves?.length - 1 || -1);

  /**
   * Toggle auto-play
   */
  toggleAutoPlay = () => {
    if (this.state.autoPlay) {
      clearInterval(this.autoPlayInterval);
      this.setState({ autoPlay: false });
    } else {
      this.autoPlayInterval = setInterval(() => {
        const { currentMoveIndex, analysis } = this.state;
        if (currentMoveIndex >= analysis.moves.length - 1) {
          clearInterval(this.autoPlayInterval);
          this.setState({ autoPlay: false });
        } else {
          this.goToNext();
        }
      }, 1500);
      this.setState({ autoPlay: true });
    }
  };

  /**
   * Get evaluation bar width
   */
  getEvalBarWidth(score, scoreType) {
    if (scoreType === 'mate') {
      return score > 0 ? 100 : 0;
    }
    // Convert score to percentage (capped at ±5 pawns)
    const clampedScore = Math.max(-5, Math.min(5, score));
    return 50 + (clampedScore * 10);
  }

  /**
   * Format evaluation score
   */
  formatScore(score, scoreType) {
    if (scoreType === 'mate') {
      return `M${Math.abs(score)}`;
    }
    const sign = score > 0 ? '+' : '';
    return `${sign}${score.toFixed(2)}`;
  }

  /**
   * Get quality class for styling
   */
  getQualityClass(quality) {
    if (!quality) return '';
    return `quality-${quality.type}`;
  }

  render() {
    const {
      isAnalyzing,
      analysisProgress,
      analysisTotal,
      analysis,
      error,
      currentMoveIndex,
      currentFen,
      showEvalBar,
      autoPlay,
    } = this.state;

    const currentMove = analysis?.moves?.[currentMoveIndex];
    const summary = analysis?.summary;

    return (
      <div className="game-review">
        {/* Header */}
        <div className="review-header">
          <h2>🔍 Game Review / 对局复盘</h2>
          {this.props.onClose && (
            <button className="close-btn" onClick={this.props.onClose}>×</button>
          )}
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <div className="analysis-loading">
            <div className="loading-spinner"></div>
            <p>Analyzing game... 分析中...</p>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(analysisProgress / analysisTotal) * 100}%` }}
              />
            </div>
            <p className="progress-text">{analysisProgress} / {analysisTotal} moves</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="analysis-error">
            <p>❌ {error}</p>
            <button onClick={() => this.analyzeGame(this.props.game)}>Retry</button>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && !isAnalyzing && (
          <div className="review-content">
            {/* Summary Panel */}
            <div className="summary-panel">
              <h3>Summary / 总结</h3>
              <div className="accuracy-comparison">
                <div className="player-accuracy white">
                  <span className="label">White / 白方</span>
                  <span className="accuracy">{summary.white.accuracy.toFixed(1)}%</span>
                  <div className="move-quality-stats">
                    {summary.white.excellent > 0 && <span className="quality-excellent">!! {summary.white.excellent}</span>}
                    {summary.white.mistake > 0 && <span className="quality-mistake">? {summary.white.mistake}</span>}
                    {summary.white.blunder > 0 && <span className="quality-blunder">?? {summary.white.blunder}</span>}
                  </div>
                </div>
                <div className="player-accuracy black">
                  <span className="label">Black / 黑方</span>
                  <span className="accuracy">{summary.black.accuracy.toFixed(1)}%</span>
                  <div className="move-quality-stats">
                    {summary.black.excellent > 0 && <span className="quality-excellent">!! {summary.black.excellent}</span>}
                    {summary.black.mistake > 0 && <span className="quality-mistake">? {summary.black.mistake}</span>}
                    {summary.black.blunder > 0 && <span className="quality-blunder">?? {summary.black.blunder}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Board and Eval */}
            <div className="board-section">
              {/* Evaluation Bar */}
              {showEvalBar && currentMove && (
                <div className="eval-bar-container">
                  <div className="eval-bar">
                    <div 
                      className="eval-white"
                      style={{ height: `${this.getEvalBarWidth(currentMove.evalAfter, currentMove.scoreType)}%` }}
                    />
                  </div>
                  <span className="eval-score">
                    {this.formatScore(currentMove.evalAfter, currentMove.scoreType)}
                  </span>
                </div>
              )}

              {/* Chess Board */}
              <div className="board-wrapper">
                <Chessboard
                  position={currentFen}
                  width={400}
                  draggable={false}
                />
              </div>
            </div>

            {/* Current Move Info */}
            {currentMove && (
              <div className={`move-info ${this.getQualityClass(currentMove.quality)}`}>
                <div className="move-header">
                  <span className="move-number">{currentMove.moveNumber}.</span>
                  <span className="move-san">{currentMove.move}</span>
                  <span className="move-quality">{currentMove.quality.emoji} {currentMove.quality.label}</span>
                </div>
                {!currentMove.wasBestMove && (
                  <div className="best-move-hint">
                    <span>Best: {currentMove.bestMove}</span>
                  </div>
                )}
                <div className="eval-change">
                  <span>Eval: {this.formatScore(currentMove.evalBefore, 'cp')} → {this.formatScore(currentMove.evalAfter, 'cp')}</span>
                  <span className={currentMove.evalChange >= 0 ? 'positive' : 'negative'}>
                    ({currentMove.evalChange >= 0 ? '+' : ''}{currentMove.evalChange.toFixed(2)})
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="navigation-controls">
              <button onClick={this.goToStart} disabled={currentMoveIndex === -1}>⏮</button>
              <button onClick={this.goToPrev} disabled={currentMoveIndex === -1}>◀</button>
              <button onClick={this.toggleAutoPlay}>
                {autoPlay ? '⏸' : '▶'}
              </button>
              <button onClick={this.goToNext} disabled={currentMoveIndex >= analysis.moves.length - 1}>▶</button>
              <button onClick={this.goToEnd} disabled={currentMoveIndex >= analysis.moves.length - 1}>⏭</button>
            </div>

            {/* Move List */}
            <div className="move-list">
              {analysis.moves.map((move, index) => (
                <span
                  key={index}
                  className={`move-item ${this.getQualityClass(move.quality)} ${index === currentMoveIndex ? 'active' : ''}`}
                  onClick={() => this.goToMove(index)}
                >
                  {index % 2 === 0 && <span className="move-num">{move.moveNumber}.</span>}
                  {move.move}
                  {move.quality.emoji && <sup>{move.quality.emoji}</sup>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* No Game State */}
        {!isAnalyzing && !analysis && !error && (
          <div className="no-game">
            <p>No game to review. Play a game first!</p>
            <p>没有可复盘的对局，请先下一盘棋！</p>
          </div>
        )}
      </div>
    );
  }
}

export default GameReview;
