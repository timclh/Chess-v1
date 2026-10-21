/**
 * Xiangqi Board Component
 * 中国象棋棋盘组件
 */

import React, { Component } from 'react';
import ReactDOM from 'react-dom';

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

// Which piece sits on each square, as a plain grid. The game mutates its board
// in place, so the previous position has to be copied to compare with the next.
const snapshotBoard = (board) =>
  Array.isArray(board) ? board.map((row) => row.map((p) => (p ? p.type + p.color : ""))) : null;

// If exactly one piece moved between two positions (optionally capturing),
// return { from: {row, col}, to: {row, col} }; otherwise null (new game, undo of
// several moves, ...) and the pieces simply appear.
export function detectSingleMove(prev, next) {
  if (!prev || !next || prev.length !== next.length) return null;
  const changed = [];
  for (let r = 0; r < next.length; r += 1) {
    for (let c = 0; c < next[r].length; c += 1) {
      if (prev[r][c] !== next[r][c]) changed.push({ row: r, col: c, before: prev[r][c], after: next[r][c] });
    }
  }
  if (changed.length !== 2) return null;
  const from = changed.find((s) => s.before && !s.after);
  const to = changed.find((s) => s.after && s.after !== "" && s !== from);
  if (!from || !to || to.after !== from.before) return null;
  return { from: { row: from.row, col: from.col }, to: { row: to.row, col: to.col } };
}

const SLIDE_MS = 220;

class XiangqiBoard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSquare: null,
      dragging: null,
      dragPosition: null,
    };
    this.boardRef = React.createRef();
    this._snapshot = snapshotBoard(props.board);
    this._dragDropAt = 0;
  }

  componentDidUpdate() {
    const next = snapshotBoard(this.props.board);
    const move = detectSingleMove(this._snapshot, next);
    this._snapshot = next;
    // A piece dropped by dragging is already where it belongs: no slide
    const droppedByDrag = Date.now() - this._dragDropAt < 600;
    if (move && !droppedByDrag) this.slidePiece(move);
  }

  // Slide the piece that just moved from its old square to its new one (FLIP:
  // it is already rendered at the destination, so animate from the offset back to 0).
  slidePiece({ from, to }) {
    if (typeof window === "undefined" || !this.boardRef.current) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = this.boardRef.current.querySelector(`.xiangqi-piece[data-sq="${to.row}-${to.col}"]`);
    if (!el || typeof el.animate !== "function") return;

    const { width = 450, orientation = "red" } = this.props;
    const cellSize = width / 9;
    const flipped = orientation === "black";
    const dx = ((flipped ? 8 - from.col : from.col) - (flipped ? 8 - to.col : to.col)) * cellSize;
    const dy = ((flipped ? 9 - from.row : from.row) - (flipped ? 9 - to.row : to.row)) * cellSize;

    el.style.zIndex = 30; // above the pieces it passes over
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1.08)`, offset: 0 },
        { transform: "translate(0, 0) scale(1.08)", offset: 0.85 },
        { transform: "translate(0, 0) scale(1)", offset: 1 },
      ],
      { duration: SLIDE_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
    const done = () => { el.style.zIndex = ""; };
    anim.onfinish = done;
    anim.oncancel = done;
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

  // The square under a screen point. Asks the browser what element is there (every piece
  // and empty square carries data-sq), so it stays right when the board is tilted by a CSS
  // 3D transform, where plain rectangle maths is wrong. Falls back to the flat maths.
  squareAtPoint(clientX, clientY) {
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      const el = document.elementFromPoint(clientX, clientY);
      const cell = el && el.closest ? el.closest('[data-sq]') : null;
      if (cell && this.boardRef.current && this.boardRef.current.contains(cell)) {
        const [row, col] = cell.getAttribute('data-sq').split('-').map(Number);
        return { row, col };
      }
      if (el) return null; // something else is under the pointer: not on the board
    }
    const rect = this.boardRef.current && this.boardRef.current.getBoundingClientRect();
    if (!rect) return null;
    const display = this.getSquareFromPixel(clientX - rect.left, clientY - rect.top);
    if (!display) return null;
    const flipped = this.props.orientation === 'black';
    return flipped ? { row: 9 - display.row, col: 8 - display.col } : display;
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
    const { onMove, board, turn, playerColor, disabled, validMoves = [] } = this.props;
    const { selectedSquare } = this.state;

    if (disabled) return;

    // Use playerColor if provided, otherwise fall back to turn (for tutorial mode)
    const canSelectColor = playerColor || turn;

    // Check if it's player's turn (in AI mode, player can only move on their turn)
    const isPlayerTurn = turn === canSelectColor;

    const piece = board[row][col];

    // If a piece is already selected
    if (selectedSquare) {
      const { row: fromRow, col: fromCol } = selectedSquare;

      // Check if clicking on a valid move destination
      const isValidMove = validMoves.some(
        m => m.row === row && m.col === col
      );

      if (isValidMove && isPlayerTurn) {
        // Make the move
        if (onMove) {
          const from = String.fromCharCode('a'.charCodeAt(0) + fromCol) + (9 - fromRow);
          const to = String.fromCharCode('a'.charCodeAt(0) + col) + (9 - row);
          onMove({ from, to });
        }
        this.setState({ selectedSquare: null });
        return;
      }

      // If clicking on own piece and it's player's turn, select it instead
      if (piece && piece.color === canSelectColor && isPlayerTurn) {
        this.setState({ selectedSquare: { row, col } });
        if (this.props.onSquareSelect) {
          this.props.onSquareSelect(row, col);
        }
        return;
      }

      // Otherwise deselect
      this.setState({ selectedSquare: null });
      if (this.props.onSquareSelect) {
        this.props.onSquareSelect(null, null);
      }
      return;
    }

    // Select own piece only if it's player's turn
    if (piece && piece.color === canSelectColor && isPlayerTurn) {
      this.setState({ selectedSquare: { row, col } });
      if (this.props.onSquareSelect) {
        this.props.onSquareSelect(row, col);
      }
    }
  };

  // Handle mouse down for dragging
  handleMouseDown = (e, row, col) => {
    const { board, turn, playerColor, disabled } = this.props;
    if (disabled) return;

    // Use playerColor if provided, otherwise fall back to turn
    const canSelectColor = playerColor || turn;
    const isPlayerTurn = turn === canSelectColor;

    const piece = board[row][col];
    if (piece && piece.color === canSelectColor && isPlayerTurn) {
      this.setState({
        selectedSquare: { row, col },
        dragging: { row, col, piece },
        dragPosition: { x: e.clientX, y: e.clientY },
      });

      if (this.props.onSquareSelect) {
        this.props.onSquareSelect(row, col);
      }
    }
  };

  // Touch event handlers — map touch coords to mouse-like behaviour
  handleTouchStart = (e, row, col) => {
    const { board, turn, playerColor, disabled } = this.props;
    if (disabled) return;

    const canSelectColor = playerColor || turn;
    const isPlayerTurn = turn === canSelectColor;
    const piece = board[row][col];

    if (piece && piece.color === canSelectColor && isPlayerTurn) {
      e.preventDefault(); // prevent scroll while dragging a piece
      const touch = e.touches[0];
      this.setState({
        selectedSquare: { row, col },
        dragging: { row, col, piece },
        dragPosition: { x: touch.clientX, y: touch.clientY },
      });

      if (this.props.onSquareSelect) {
        this.props.onSquareSelect(row, col);
      }
    }
  };

  handleTouchMove = (e) => {
    if (!this.state.dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.setState({ dragPosition: { x: touch.clientX, y: touch.clientY } });
  };

  handleTouchEnd = (e) => {
    const { dragging } = this.state;
    const { onMove, validMoves = [] } = this.props;
    if (!dragging) return;

    e.preventDefault();
    // Use last known drag position (changedTouches gives lift-off point)
    const touch = e.changedTouches[0];
    const target = this.squareAtPoint(touch.clientX, touch.clientY);

    if (target) {
      const isValidMove = validMoves.some(
        m => m.row === target.row && m.col === target.col
      );
      if (isValidMove && onMove) {
        const from = String.fromCharCode('a'.charCodeAt(0) + dragging.col) + (9 - dragging.row);
        const to = String.fromCharCode('a'.charCodeAt(0) + target.col) + (9 - target.row);
        this._dragDropAt = Date.now();
        onMove({ from, to });
        this.setState({ selectedSquare: null });
      }
    }
    this.setState({ dragging: null, dragPosition: null });
  };

  handleMouseMove = (e) => {
    if (!this.state.dragging) return;

    this.setState({ dragPosition: { x: e.clientX, y: e.clientY } });
  };

  handleMouseUp = (e) => {
    const { dragging } = this.state;
    const { onMove, validMoves = [] } = this.props;

    if (!dragging) return;

    const target = this.squareAtPoint(e.clientX, e.clientY);

    if (target) {
      const isValidMove = validMoves.some(
        m => m.row === target.row && m.col === target.col
      );

      if (isValidMove && onMove) {
        const from = String.fromCharCode('a'.charCodeAt(0) + dragging.col) + (9 - dragging.row);
        const to = String.fromCharCode('a'.charCodeAt(0) + target.col) + (9 - target.row);
        this._dragDropAt = Date.now();
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
      hintMove,
      highlightSquares = {},
      tilt = 0,
    } = this.props;
    const { selectedSquare, dragging, dragPosition } = this.state;

    const height = width * 10 / 9;
    const cellSize = width / 9;
    const padding = cellSize / 2;
    const pieceSize = cellSize * 0.85;

    // Determine if board should be flipped
    const flipped = orientation === 'black';

    const tilted = tilt > 0;

    return (
      // The stage gives the tilted board its perspective; flat boards render as before
      <div
        className={`xiangqi-board-stage ${tilted ? 'tilted' : ''}`}
        style={tilted ? { width, perspective: width * 2.4, perspectiveOrigin: '50% 30%', paddingBottom: pieceSize * 0.35 } : undefined}
      >
      <div
        ref={this.boardRef}
        className="xiangqi-board-container"
        style={{
          width,
          height,
          position: 'relative',
          touchAction: 'none',
          ...(tilted ? { transform: `rotateX(${tilt}deg)`, transformOrigin: '50% 88%' } : null),
        }}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUp}
        onMouseLeave={this.handleMouseLeave}
        onTouchMove={this.handleTouchMove}
        onTouchEnd={this.handleTouchEnd}
      >
        {/* Board SVG */}
        <svg width={width} height={height} className="xiangqi-board-svg">
          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill="#E7CD97" />

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

          {/* Coach hint: gold ring on the piece to move, filled gold ring on the target */}
          {hintMove && ['from', 'to'].map((end) => {
            const row = end === 'from' ? hintMove.fromRow : hintMove.toRow;
            const col = end === 'from' ? hintMove.fromCol : hintMove.toCol;
            // Slightly larger than the piece so the ring stays visible around it
            const ringSize = pieceSize * 1.2;
            return (
              <div
                key={`hint-${end}`}
                className={`xiangqi-highlight hint-move hint-${end}`}
                style={{
                  position: 'absolute',
                  left: padding + (flipped ? 8 - col : col) * cellSize - ringSize / 2,
                  top: padding + (flipped ? 9 - row : row) * cellSize - ringSize / 2,
                  width: ringSize,
                  height: ringSize,
                  borderRadius: '50%',
                }}
              />
            );
          })}
        </div>

        {/* Pieces layer */}
        {/* The layer itself lets clicks through to the square targets underneath; only the pieces catch them */}
        <div className="xiangqi-pieces" style={{ position: 'absolute', top: 0, left: 0, width, height, zIndex: 10, pointerEvents: 'none', '--piece-size': `${pieceSize}px` }}>
          {board && board.map((row, rowIdx) =>
            row.map((piece, colIdx) => {
              if (!piece) return null;

              // Skip if this piece is being dragged
              if (dragging && dragging.row === rowIdx && dragging.col === colIdx) {
                return null;
              }

              // Guard against invalid piece data
              const pieceChar = PIECE_CHARS[piece.type]?.[piece.color];
              if (!pieceChar) return null;

              const displayRow = flipped ? 9 - rowIdx : rowIdx;
              const displayCol = flipped ? 8 - colIdx : colIdx;

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  data-sq={`${rowIdx}-${colIdx}`}
                  className={`xiangqi-piece ${piece.color === 'r' ? 'red' : 'black'}${selectedSquare && selectedSquare.row === rowIdx && selectedSquare.col === colIdx ? ' selected' : ''}`}
                  style={{
                    position: 'absolute',
                    left: padding + displayCol * cellSize - pieceSize / 2,
                    top: padding + displayRow * cellSize - pieceSize / 2,
                    width: pieceSize,
                    height: pieceSize,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                  onClick={() => this.handleClick(rowIdx, colIdx)}
                  onMouseDown={(e) => this.handleMouseDown(e, rowIdx, colIdx)}
                  onTouchStart={(e) => this.handleTouchStart(e, rowIdx, colIdx)}
                >
                  {pieceChar}
                </div>
              );
            })
          )}

        </div>

        {/* Dragging piece: drawn on the page (not inside the tilted board) at the pointer */}
        {dragging && dragPosition && PIECE_CHARS[dragging.piece?.type]?.[dragging.piece?.color] && ReactDOM.createPortal(
          <div
            className={`xiangqi-piece ${dragging.piece.color === 'r' ? 'red' : 'black'} dragging`}
            style={{
              position: 'fixed',
              left: dragPosition.x - pieceSize / 2,
              top: dragPosition.y - pieceSize / 2,
              width: pieceSize,
              height: pieceSize,
              pointerEvents: 'none',
              zIndex: 1000,
              '--piece-size': `${pieceSize}px`,
            }}
          >
            {PIECE_CHARS[dragging.piece.type][dragging.piece.color]}
          </div>,
          document.body
        )}

        {/* Click targets (invisible) - for empty squares */}
        <div className="xiangqi-click-targets" style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none' }}>
          {[...Array(10)].map((_, rowIdx) =>
            [...Array(9)].map((_, colIdx) => {
              const actualRow = flipped ? 9 - rowIdx : rowIdx;
              const actualCol = flipped ? 8 - colIdx : colIdx;
              const piece = board[actualRow][actualCol];

              // Only create click targets for empty squares
              if (piece) return null;

              return (
                <div
                  key={`target-${rowIdx}-${colIdx}`}
                  data-sq={`${actualRow}-${actualCol}`}
                  style={{
                    position: 'absolute',
                    left: padding + colIdx * cellSize - cellSize / 2,
                    top: padding + rowIdx * cellSize - cellSize / 2,
                    width: cellSize,
                    height: cellSize,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                  onClick={() => this.handleClick(actualRow, actualCol)}
                />
              );
            })
          )}
        </div>
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
