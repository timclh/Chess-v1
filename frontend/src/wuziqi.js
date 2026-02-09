/**
 * WuziQi (五子棋 / Gomoku) Game Engine
 *
 * 15×15 board, win by placing 5 in a row (horizontal, vertical, or diagonal).
 * Supports standard Gomoku rules (free-style, no forbidden moves).
 */

const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;  // Black moves first
const WHITE = 2;

// Directions for line scanning: [dr, dc]
const DIRECTIONS = [
  [0, 1],   // horizontal →
  [1, 0],   // vertical ↓
  [1, 1],   // diagonal ↘
  [1, -1],  // diagonal ↙
];

class WuziQi {
  constructor() {
    this.reset();
  }

  reset() {
    // 15×15 board, 0 = empty, 1 = black, 2 = white
    this.board = Array.from({ length: BOARD_SIZE }, () =>
      new Array(BOARD_SIZE).fill(EMPTY)
    );
    this.turn = BLACK; // Black plays first
    this.moveHistory = [];
    this.winner = null;
    this.gameOver = false;
    this.lastMove = null;
  }

  /**
   * Clone the current game state.
   */
  clone() {
    const g = new WuziQi();
    g.board = this.board.map(row => [...row]);
    g.turn = this.turn;
    g.moveHistory = [...this.moveHistory];
    g.winner = this.winner;
    g.gameOver = this.gameOver;
    g.lastMove = this.lastMove;
    return g;
  }

  /**
   * Check if a position is within the board.
   */
  inBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  /**
   * Place a stone at (row, col). Returns true if valid, false otherwise.
   */
  place(row, col) {
    if (this.gameOver) return false;
    if (!this.inBounds(row, col)) return false;
    if (this.board[row][col] !== EMPTY) return false;

    this.board[row][col] = this.turn;
    this.lastMove = { row, col, color: this.turn };
    this.moveHistory.push({ row, col, color: this.turn });

    // Check for win
    if (this.checkWin(row, col, this.turn)) {
      this.winner = this.turn;
      this.gameOver = true;
    } else if (this.moveHistory.length === BOARD_SIZE * BOARD_SIZE) {
      // Board is full — draw
      this.gameOver = true;
    }

    // Switch turn
    this.turn = this.turn === BLACK ? WHITE : BLACK;
    return true;
  }

  /**
   * Undo the last move.
   */
  undo() {
    if (this.moveHistory.length === 0) return false;
    const last = this.moveHistory.pop();
    this.board[last.row][last.col] = EMPTY;
    this.turn = last.color;
    this.winner = null;
    this.gameOver = false;
    this.lastMove = this.moveHistory.length > 0
      ? this.moveHistory[this.moveHistory.length - 1]
      : null;
    return true;
  }

  /**
   * Check if placing at (row, col) by `color` creates 5-in-a-row.
   */
  checkWin(row, col, color) {
    for (const [dr, dc] of DIRECTIONS) {
      let count = 1;
      // Count in positive direction
      for (let i = 1; i < 5; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (this.inBounds(nr, nc) && this.board[nr][nc] === color) {
          count++;
        } else break;
      }
      // Count in negative direction
      for (let i = 1; i < 5; i++) {
        const nr = row - dr * i;
        const nc = col - dc * i;
        if (this.inBounds(nr, nc) && this.board[nr][nc] === color) {
          count++;
        } else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  /**
   * Get all empty cells (valid moves).
   */
  getValidMoves() {
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.board[r][c] === EMPTY) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  /**
   * Get "interesting" moves — empty cells near existing stones (within 2 squares).
   * Used to reduce search space for AI.
   */
  getCandidateMoves() {
    if (this.moveHistory.length === 0) {
      // First move: center
      return [{ row: 7, col: 7 }];
    }

    const candidates = new Set();
    const radius = 2;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.board[r][c] !== EMPTY) continue;
        // Check if near any placed stone
        let near = false;
        for (let dr = -radius; dr <= radius && !near; dr++) {
          for (let dc = -radius; dc <= radius && !near; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (this.inBounds(nr, nc) && this.board[nr][nc] !== EMPTY) {
              near = true;
            }
          }
        }
        if (near) {
          candidates.add(`${r},${c}`);
        }
      }
    }

    return Array.from(candidates).map(key => {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  /**
   * Get the count in a line from (row, col) in direction (dr, dc) for the given color.
   */
  countInDirection(row, col, dr, dc, color) {
    let count = 0;
    for (let i = 1; i < 5; i++) {
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (this.inBounds(nr, nc) && this.board[nr][nc] === color) {
        count++;
      } else break;
    }
    return count;
  }

  /**
   * Get a serialized board string for display/debugging.
   */
  toString() {
    const symbols = { [EMPTY]: '.', [BLACK]: 'X', [WHITE]: 'O' };
    return this.board.map(row => row.map(c => symbols[c]).join(' ')).join('\n');
  }
}

export default WuziQi;
export { BOARD_SIZE, EMPTY, BLACK, WHITE, DIRECTIONS };
