/**
 * WuziQiBoard — React Component for rendering a 15×15 Go/Gomoku board
 *
 * Props:
 *   board      – 15×15 2-D array (0=empty, 1=black, 2=white)
 *   lastMove   – { row, col } of the last placed stone
 *   onCellClick(row, col) – click handler
 *   disabled   – true to prevent clicks
 *   winLine    – array of {row, col} positions forming the winning 5
 */

import React, { Component } from 'react';
import { BOARD_SIZE, EMPTY, BLACK, WHITE } from './wuziqi';

const CELL_SIZE = 32;       // px between intersections
const PADDING = 20;         // board edge padding
const STONE_RADIUS = 14;    // stone size
const BOARD_PX = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2;

class WuziQiBoard extends Component {
  handleClick = (e) => {
    if (this.props.disabled) return;
    const { onCellClick, board } = this.props;
    if (!onCellClick) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Snap to nearest intersection
    const col = Math.round((x - PADDING) / CELL_SIZE);
    const row = Math.round((y - PADDING) / CELL_SIZE);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      if (board[row][col] === EMPTY) {
        onCellClick(row, col);
      }
    }
  };

  handleTouchEnd = (e) => {
    if (this.props.disabled) return;
    e.preventDefault();
    const { onCellClick, board } = this.props;
    if (!onCellClick) return;

    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const col = Math.round((x - PADDING) / CELL_SIZE);
    const row = Math.round((y - PADDING) / CELL_SIZE);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      if (board[row][col] === EMPTY) {
        onCellClick(row, col);
      }
    }
  };

  render() {
    const { board, lastMove, winLine, disabled } = this.props;
    const winSet = new Set((winLine || []).map(p => `${p.row},${p.col}`));

    // Build SVG elements
    const lines = [];
    const stones = [];
    const labels = [];
    const starPoints = [];

    // Grid lines
    for (let i = 0; i < BOARD_SIZE; i++) {
      // Horizontal
      lines.push(
        <line
          key={`h${i}`}
          x1={PADDING}
          y1={PADDING + i * CELL_SIZE}
          x2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
          y2={PADDING + i * CELL_SIZE}
          stroke="#5c4a2a"
          strokeWidth={i === 0 || i === BOARD_SIZE - 1 ? 1.5 : 0.8}
        />
      );
      // Vertical
      lines.push(
        <line
          key={`v${i}`}
          x1={PADDING + i * CELL_SIZE}
          y1={PADDING}
          x2={PADDING + i * CELL_SIZE}
          y2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
          stroke="#5c4a2a"
          strokeWidth={i === 0 || i === BOARD_SIZE - 1 ? 1.5 : 0.8}
        />
      );
    }

    // Star points (standard gomoku: 5 star positions)
    const starPositions = [
      [3, 3], [3, 11], [11, 3], [11, 11], [7, 7],
    ];
    for (const [sr, sc] of starPositions) {
      starPoints.push(
        <circle
          key={`star${sr}${sc}`}
          cx={PADDING + sc * CELL_SIZE}
          cy={PADDING + sr * CELL_SIZE}
          r={3}
          fill="#5c4a2a"
        />
      );
    }

    // Coordinate labels
    const colLabels = 'ABCDEFGHIJKLMNO';
    for (let i = 0; i < BOARD_SIZE; i++) {
      labels.push(
        <text
          key={`cl${i}`}
          x={PADDING + i * CELL_SIZE}
          y={PADDING - 8}
          textAnchor="middle"
          fontSize="9"
          fill="#8a7a5a"
        >
          {colLabels[i]}
        </text>
      );
      labels.push(
        <text
          key={`rl${i}`}
          x={PADDING - 12}
          y={PADDING + i * CELL_SIZE + 3}
          textAnchor="middle"
          fontSize="9"
          fill="#8a7a5a"
        >
          {BOARD_SIZE - i}
        </text>
      );
    }

    // Stones
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === EMPTY) continue;
        const cx = PADDING + c * CELL_SIZE;
        const cy = PADDING + r * CELL_SIZE;
        const isBlack = board[r][c] === BLACK;
        const isLast = lastMove && lastMove.row === r && lastMove.col === c;
        const isWin = winSet.has(`${r},${c}`);

        stones.push(
          <g key={`s${r}_${c}`}>
            {/* Shadow */}
            <circle cx={cx + 1.5} cy={cy + 1.5} r={STONE_RADIUS} fill="rgba(0,0,0,0.2)" />
            {/* Stone */}
            <circle
              cx={cx}
              cy={cy}
              r={STONE_RADIUS}
              fill={isBlack ? '#1a1a1a' : '#f5f5f5'}
              stroke={isWin ? '#ff0' : (isLast ? '#e74c3c' : (isBlack ? '#000' : '#ccc'))}
              strokeWidth={isWin ? 2.5 : (isLast ? 2 : 0.5)}
            />
            {/* Shine effect for white stones */}
            {!isBlack && (
              <circle cx={cx - 4} cy={cy - 4} r={5} fill="rgba(255,255,255,0.6)" />
            )}
            {/* Shine effect for black stones */}
            {isBlack && (
              <circle cx={cx - 4} cy={cy - 4} r={4} fill="rgba(255,255,255,0.15)" />
            )}
            {/* Move number for last move */}
            {isLast && (
              <circle cx={cx} cy={cy} r={4} fill="#e74c3c" />
            )}
          </g>
        );
      }
    }

    return (
      <div className="wuziqi-board-wrapper">
        <svg
          width={BOARD_PX}
          height={BOARD_PX}
          viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
          className="wuziqi-board-svg"
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          onClick={this.handleClick}
          onTouchEnd={this.handleTouchEnd}
        >
          {/* Board background */}
          <rect x="0" y="0" width={BOARD_PX} height={BOARD_PX} fill="#dcb35c" rx="4" />
          
          {lines}
          {starPoints}
          {labels}
          {stones}
        </svg>
      </div>
    );
  }
}

export default WuziQiBoard;
