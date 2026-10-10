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

  // Convert pixel coordinates (relative to the board, in board units) to the
  // logical board position. Accounts for a flipped (black) orientation.
  getSquareFromPixel(x, y) {
    const { width = 450, orientation = 'red' } = this.props;
    const cellSize = width / 9;
    const padding = cellSize / 2;

    const displayCol = Math.round((x - padding) / cellSize);
    const displayRow = Math.round((y - padding) / cellSize);

    if (displayRow >= 0 && displayRow < 10 && displayCol >= 0 && displayCol < 9) {
      const flipped = orientation === 'black';
      return {
        row: flipped ? 9 - displayRow : displayRow,
        col: flipped ? 8 - displayCol : displayCol,
      };
    }
    return null;
  }

  // Pointer position inside the board, in the board's own pixel units
  getBoardPoint(e) {
    const { width = 450 } = this.props;
    const rect = this.boardRef.current.getBoundingClientRect();
    const scale = rect.width ? width / rect.width : 1;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }

  squareName(row, col) {
    return String.fromCharCode('a'.charCodeAt(0) + col) + (9 - row);
  }

  commitMove(from, to) {
    const { onMove } = this.props;
    this.setState({ selectedSquare: null, dragging: null, dragPosition: null });
    if (onMove) {
      onMove({ from: this.squareName(from.row, from.col), to: this.squareName(to.row, to.col) });
    }
  }

  // One handler for mouse, pen and touch:
  //  - tap/click a legal destination of the selected piece -> move
  //  - tap/click an own piece -> select it (and arm a drag)
  //  - anything else -> deselect
  handlePointerDown = (e) => {
    const { board, turn, playerColor, disabled, validMoves = [], onSquareSelect } = this.props;
    if (disabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const point = this.getBoardPoint(e);
    const sq = this.getSquareFromPixel(point.x, point.y);
    if (!sq) return;

    // Use playerColor if provided, otherwise fall back to turn (tutorial mode)
    const canSelectColor = playerColor || turn;
    if (turn !== canSelectColor) return; // not the player's turn

    const { selectedSquare } = this.state;
    const piece = board[sq.row][sq.col];

    if (selectedSquare && validMoves.some(m => m.row === sq.row && m.col === sq.col)) {
      this.commitMove(selectedSquare, sq);
      return;
    }

    if (piece && piece.color === canSelectColor) {
      try {
        this.boardRef.current.setPointerCapture(e.pointerId);
      } catch (err) {
        // pointer capture is optional
      }
      this.setState({
        selectedSquare: sq,
        dragging: { row: sq.row, col: sq.col, piece, moved: false, startX: point.x, startY: point.y },
        dragPosition: point,
      });
      if (onSquareSelect) onSquareSelect(sq.row, sq.col);
      return;
    }

    // Tapped somewhere that is not a legal destination: explain why and keep the selection
    if (selectedSquare && !(selectedSquare.row === sq.row && selectedSquare.col === sq.col)) {
      if (this.props.onIllegalMove) this.props.onIllegalMove(selectedSquare, sq);
      return;
    }

    this.setState({ selectedSquare: null });
    if (onSquareSelect) onSquareSelect(null, null);
  };

  handlePointerMove = (e) => {
    const { dragging } = this.state;
    if (!dragging) return;

    const point = this.getBoardPoint(e);
    const moved = dragging.moved || Math.hypot(point.x - dragging.startX, point.y - dragging.startY) > 6;
    this.setState({ dragPosition: point, dragging: { ...dragging, moved } });
  };

  handlePointerUp = (e) => {
    const { dragging, selectedSquare } = this.state;
    const { validMoves = [] } = this.props;
    if (!dragging) return;

    // A real drag drops the piece on a legal square; a plain tap keeps the selection
    if (dragging.moved && selectedSquare) {
      const point = this.getBoardPoint(e);
      const target = this.getSquareFromPixel(point.x, point.y);
      if (target && validMoves.some(m => m.row === target.row && m.col === target.col)) {
        this.commitMove(selectedSquare, target);
        return;
      }
      if (target && this.props.onIllegalMove) this.props.onIllegalMove(selectedSquare, target);
    }
    this.setState({ dragging: null, dragPosition: null });
  };

  handlePointerCancel = () => {
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
        style={{ width, height, position: 'relative', touchAction: 'none', userSelect: 'none' }}
        onPointerDown={this.handlePointerDown}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUp}
        onPointerCancel={this.handlePointerCancel}
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
        <div className="xiangqi-pieces" style={{ position: 'absolute', top: 0, left: 0, width, height, zIndex: 10, pointerEvents: 'none' }}>
          {board && board.map((row, rowIdx) =>
            row.map((piece, colIdx) => {
              if (!piece) return null;

              // Skip if this piece is being dragged
              if (dragging && dragging.moved && dragging.row === rowIdx && dragging.col === colIdx) {
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
                >
                  {PIECE_CHARS[piece.type][piece.color]}
                </div>
              );
            })
          )}

          {/* Dragging piece */}
          {dragging && dragging.moved && dragPosition && (
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
