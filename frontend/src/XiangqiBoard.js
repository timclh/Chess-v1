/**
 * Xiangqi Board Component
 * 中国象棋棋盘组件
 */

import React, { Component } from 'react';

// Piece display characters
const PIECE_CHARS = {
  r: { r: '车', b: '車' },
  h: { r: '马', b: '馬' },
  e: { r: '相', b: '象' },
  a: { r: '仕', b: '士' },
  k: { r: '帅', b: '将' },
  c: { r: '炮', b: '砲' },
  s: { r: '兵', b: '卒' },
};

class XiangqiBoard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSquare: null,
      dragging: null,
      dragPosition: null,
    };
    this.boardRef = React.createRef();
  }

  // Convert board position to pixel coordinates
  getSquareCenter(row, col) {
    const { width = 450 } = this.props;
    const cellSize = width / 9;
    const padding = cellSize / 2;

    return {
      x: padding + col * cellSize,
      y: padding + row * cellSize,
    };
  }

  // Convert pixel coordinates to board position
  getSquareFromPixel(x, y) {
    const { width = 450 } = this.props;
    const cellSize = width / 9;
    const padding = cellSize / 2;

    const col = Math.round((x - padding) / cellSize);
    const row = Math.round((y - padding) / cellSize);

    if (row >= 0 && row < 10 && col >= 0 && col < 9) {
      return { row, col };
    }
    return null;
  }

  // Handle square click
  handleClick = (row, col) => {
    const { onMove, board, turn, disabled, validMoves = [] } = this.props;
    const { selectedSquare } = this.state;

    if (disabled) return;

    const piece = board[row][col];

    // If a piece is already selected
    if (selectedSquare) {
      const { row: fromRow, col: fromCol } = selectedSquare;

      // Check if clicking on a valid move destination
      const isValidMove = validMoves.some(
        m => m.row === row && m.col === col
      );

      if (isValidMove) {
        // Make the move
        if (onMove) {
          const from = String.fromCharCode('a'.charCodeAt(0) + fromCol) + (9 - fromRow);
          const to = String.fromCharCode('a'.charCodeAt(0) + col) + (9 - row);
          onMove({ from, to });
        }
        this.setState({ selectedSquare: null });
        return;
      }

      // If clicking on own piece, select it instead
      if (piece && piece.color === turn) {
        this.setState({ selectedSquare: { row, col } });
        if (this.props.onSquareSelect) {
          this.props.onSquareSelect(row, col);
        }
        return;
      }

      // Otherwise deselect
      this.setState({ selectedSquare: null });
      return;
    }

    // Select own piece
    if (piece && piece.color === turn) {
      this.setState({ selectedSquare: { row, col } });
      if (this.props.onSquareSelect) {
        this.props.onSquareSelect(row, col);
      }
    }
  };

  // Handle mouse down for dragging
  handleMouseDown = (e, row, col) => {
    const { board, turn, disabled } = this.props;
    if (disabled) return;

    const piece = board[row][col];
    if (piece && piece.color === turn) {
      const rect = this.boardRef.current.getBoundingClientRect();
      this.setState({
        selectedSquare: { row, col },
        dragging: { row, col, piece },
        dragPosition: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
      });

      if (this.props.onSquareSelect) {
        this.props.onSquareSelect(row, col);
      }
    }
  };

  handleMouseMove = (e) => {
    if (!this.state.dragging) return;

    const rect = this.boardRef.current.getBoundingClientRect();
    this.setState({
      dragPosition: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    });
  };

  handleMouseUp = (e) => {
    const { dragging } = this.state;
    const { onMove, validMoves = [] } = this.props;

    if (!dragging) return;

    const rect = this.boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const target = this.getSquareFromPixel(x, y);

    if (target) {
      const isValidMove = validMoves.some(
        m => m.row === target.row && m.col === target.col
      );

      if (isValidMove && onMove) {
        const from = String.fromCharCode('a'.charCodeAt(0) + dragging.col) + (9 - dragging.row);
        const to = String.fromCharCode('a'.charCodeAt(0) + target.col) + (9 - target.row);
        onMove({ from, to });
        this.setState({ selectedSquare: null });
      }
    }

    this.setState({ dragging: null, dragPosition: null });
  };

  handleMouseLeave = () => {
    if (this.state.dragging) {
      this.setState({ dragging: null, dragPosition: null });
    }
  };

  // Render the board
  render() {
    const {
      board,
      width = 450,
      orientation = 'red',
      validMoves = [],
      lastMove,
      highlightSquares = {},
    } = this.props;
    const { selectedSquare, dragging, dragPosition } = this.state;

    const height = width * 10 / 9;
    const cellSize = width / 9;
    const padding = cellSize / 2;
    const pieceSize = cellSize * 0.85;

    // Determine if board should be flipped
    const flipped = orientation === 'black';

    return (
      <div
        ref={this.boardRef}
        className="xiangqi-board-container"
        style={{ width, height, position: 'relative' }}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUp}
        onMouseLeave={this.handleMouseLeave}
      >
        {/* Board SVG */}
        <svg width={width} height={height} className="xiangqi-board-svg">
          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill="#f5d6a8" />

          {/* Grid lines - vertical */}
          {[...Array(9)].map((_, i) => {
            const x = padding + i * cellSize;
            // Don't draw full vertical lines at edges for the river area
            if (i === 0 || i === 8) {
              return (
                <g key={`v${i}`}>
                  <line x1={x} y1={padding} x2={x} y2={padding + 4 * cellSize} stroke="#8b4513" strokeWidth="1" />
                  <line x1={x} y1={padding + 5 * cellSize} x2={x} y2={padding + 9 * cellSize} stroke="#8b4513" strokeWidth="1" />
                </g>
              );
            }
            return (
              <line key={`v${i}`} x1={x} y1={padding} x2={x} y2={padding + 9 * cellSize} stroke="#8b4513" strokeWidth="1" />
            );
          })}

          {/* Grid lines - horizontal */}
          {[...Array(10)].map((_, i) => {
            const y = padding + i * cellSize;
            return (
              <line key={`h${i}`} x1={padding} y1={y} x2={padding + 8 * cellSize} y2={y} stroke="#8b4513" strokeWidth="1" />
            );
          })}

          {/* Palace diagonals - top */}
          <line x1={padding + 3 * cellSize} y1={padding} x2={padding + 5 * cellSize} y2={padding + 2 * cellSize} stroke="#8b4513" strokeWidth="1" />
          <line x1={padding + 5 * cellSize} y1={padding} x2={padding + 3 * cellSize} y2={padding + 2 * cellSize} stroke="#8b4513" strokeWidth="1" />

          {/* Palace diagonals - bottom */}
          <line x1={padding + 3 * cellSize} y1={padding + 7 * cellSize} x2={padding + 5 * cellSize} y2={padding + 9 * cellSize} stroke="#8b4513" strokeWidth="1" />
          <line x1={padding + 5 * cellSize} y1={padding + 7 * cellSize} x2={padding + 3 * cellSize} y2={padding + 9 * cellSize} stroke="#8b4513" strokeWidth="1" />

          {/* River text */}
          <text x={width / 2 - 60} y={padding + 4.5 * cellSize + 5} fill="#8b4513" fontSize="16" fontWeight="bold">楚 河</text>
          <text x={width / 2 + 20} y={padding + 4.5 * cellSize + 5} fill="#8b4513" fontSize="16" fontWeight="bold">汉 界</text>

          {/* Cannon and soldier position marks */}
          {this.renderPositionMarks(padding, cellSize)}

          {/* Border */}
          <rect x={padding - 5} y={padding - 5} width={8 * cellSize + 10} height={9 * cellSize + 10} fill="none" stroke="#8b4513" strokeWidth="3" />
        </svg>

        {/* Highlight layer */}
        <div className="xiangqi-highlights" style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none' }}>
          {/* Selected square highlight */}
          {selectedSquare && (
            <div
              className="xiangqi-highlight selected"
              style={{
                position: 'absolute',
                left: padding + (flipped ? 8 - selectedSquare.col : selectedSquare.col) * cellSize - pieceSize / 2,
                top: padding + (flipped ? 9 - selectedSquare.row : selectedSquare.row) * cellSize - pieceSize / 2,
                width: pieceSize,
                height: pieceSize,
                borderRadius: '50%',
                background: 'rgba(255, 255, 0, 0.4)',
              }}
            />
          )}

          {/* Valid move highlights */}
          {validMoves.map((move, idx) => {
            const displayRow = flipped ? 9 - move.row : move.row;
            const displayCol = flipped ? 8 - move.col : move.col;
            const isCapture = board[move.row][move.col] !== null;

            return (
              <div
                key={idx}
                className={`xiangqi-highlight valid-move ${isCapture ? 'capture' : ''}`}
                style={{
                  position: 'absolute',
                  left: padding + displayCol * cellSize - (isCapture ? pieceSize / 2 : 8),
                  top: padding + displayRow * cellSize - (isCapture ? pieceSize / 2 : 8),
                  width: isCapture ? pieceSize : 16,
                  height: isCapture ? pieceSize : 16,
                  borderRadius: '50%',
                  background: isCapture ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 200, 0, 0.6)',
                  border: isCapture ? '3px solid rgba(255, 0, 0, 0.6)' : 'none',
                }}
              />
            );
          })}

          {/* Last move highlight */}
          {lastMove && (
            <>
              <div
                className="xiangqi-highlight last-move"
                style={{
                  position: 'absolute',
                  left: padding + (flipped ? 8 - lastMove.fromCol : lastMove.fromCol) * cellSize - pieceSize / 2,
                  top: padding + (flipped ? 9 - lastMove.fromRow : lastMove.fromRow) * cellSize - pieceSize / 2,
                  width: pieceSize,
                  height: pieceSize,
                  borderRadius: '50%',
                  background: 'rgba(100, 149, 237, 0.3)',
                }}
              />
              <div
                className="xiangqi-highlight last-move"
                style={{
                  position: 'absolute',
                  left: padding + (flipped ? 8 - lastMove.toCol : lastMove.toCol) * cellSize - pieceSize / 2,
                  top: padding + (flipped ? 9 - lastMove.toRow : lastMove.toRow) * cellSize - pieceSize / 2,
                  width: pieceSize,
                  height: pieceSize,
                  borderRadius: '50%',
                  background: 'rgba(100, 149, 237, 0.5)',
                }}
              />
            </>
          )}
        </div>

        {/* Pieces layer */}
        <div className="xiangqi-pieces" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
          {board && board.map((row, rowIdx) =>
            row.map((piece, colIdx) => {
              if (!piece) return null;

              // Skip if this piece is being dragged
              if (dragging && dragging.row === rowIdx && dragging.col === colIdx) {
                return null;
              }

              const displayRow = flipped ? 9 - rowIdx : rowIdx;
              const displayCol = flipped ? 8 - colIdx : colIdx;

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`xiangqi-piece ${piece.color === 'r' ? 'red' : 'black'}`}
                  style={{
                    position: 'absolute',
                    left: padding + displayCol * cellSize - pieceSize / 2,
                    top: padding + displayRow * cellSize - pieceSize / 2,
                    width: pieceSize,
                    height: pieceSize,
                    cursor: 'pointer',
                  }}
                  onClick={() => this.handleClick(rowIdx, colIdx)}
                  onMouseDown={(e) => this.handleMouseDown(e, rowIdx, colIdx)}
                >
                  {PIECE_CHARS[piece.type][piece.color]}
                </div>
              );
            })
          )}

          {/* Dragging piece */}
          {dragging && dragPosition && (
            <div
              className={`xiangqi-piece ${dragging.piece.color === 'r' ? 'red' : 'black'} dragging`}
              style={{
                position: 'absolute',
                left: dragPosition.x - pieceSize / 2,
                top: dragPosition.y - pieceSize / 2,
                width: pieceSize,
                height: pieceSize,
                pointerEvents: 'none',
                zIndex: 100,
              }}
            >
              {PIECE_CHARS[dragging.piece.type][dragging.piece.color]}
            </div>
          )}
        </div>

        {/* Click targets (invisible) */}
        <div className="xiangqi-click-targets" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
          {[...Array(10)].map((_, rowIdx) =>
            [...Array(9)].map((_, colIdx) => {
              const actualRow = flipped ? 9 - rowIdx : rowIdx;
              const actualCol = flipped ? 8 - colIdx : colIdx;
              const piece = board[actualRow][actualCol];

              // Only create click targets for empty squares or opponent pieces when a piece is selected
              if (piece) return null;

              return (
                <div
                  key={`target-${rowIdx}-${colIdx}`}
                  style={{
                    position: 'absolute',
                    left: padding + colIdx * cellSize - cellSize / 3,
                    top: padding + rowIdx * cellSize - cellSize / 3,
                    width: cellSize * 2 / 3,
                    height: cellSize * 2 / 3,
                    cursor: 'pointer',
                  }}
                  onClick={() => this.handleClick(actualRow, actualCol)}
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Render position marks (for cannons and soldiers)
  renderPositionMarks(padding, cellSize) {
    const marks = [];
    const markSize = 6;
    const offset = 4;

    // Soldier and cannon positions
    const positions = [
      // Cannons
      { row: 2, col: 1 }, { row: 2, col: 7 },
      { row: 7, col: 1 }, { row: 7, col: 7 },
      // Soldiers
      { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 3, col: 6 }, { row: 3, col: 8 },
      { row: 6, col: 0 }, { row: 6, col: 2 }, { row: 6, col: 4 }, { row: 6, col: 6 }, { row: 6, col: 8 },
    ];

    positions.forEach((pos, idx) => {
      const x = padding + pos.col * cellSize;
      const y = padding + pos.row * cellSize;

      // Draw L-shaped marks at corners
      const drawCorner = (cx, cy, dx, dy) => {
        marks.push(
          <g key={`mark-${idx}-${dx}-${dy}`}>
            <line x1={cx + dx * offset} y1={cy + dy * offset} x2={cx + dx * (offset + markSize)} y2={cy + dy * offset} stroke="#8b4513" strokeWidth="1" />
            <line x1={cx + dx * offset} y1={cy + dy * offset} x2={cx + dx * offset} y2={cy + dy * (offset + markSize)} stroke="#8b4513" strokeWidth="1" />
          </g>
        );
      };

      // Don't draw marks outside the board
      if (pos.col > 0) {
        drawCorner(x, y, -1, -1);
        drawCorner(x, y, -1, 1);
      }
      if (pos.col < 8) {
        drawCorner(x, y, 1, -1);
        drawCorner(x, y, 1, 1);
      }
    });

    return marks;
  }
}

export default XiangqiBoard;
