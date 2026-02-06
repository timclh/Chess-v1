/**
 * Xiangqi (Chinese Chess) Game Logic
 * 中国象棋游戏逻辑
 */

// Piece types
const PIECES = {
  GENERAL: 'k',      // 将/帅
  ADVISOR: 'a',      // 士/仕
  ELEPHANT: 'e',     // 象/相
  HORSE: 'h',        // 马
  CHARIOT: 'r',      // 车
  CANNON: 'c',       // 炮
  SOLDIER: 's',      // 兵/卒
};

// Piece display names
const PIECE_NAMES = {
  r: { r: '车', b: '車' },
  h: { r: '马', b: '馬' },
  e: { r: '相', b: '象' },
  a: { r: '仕', b: '士' },
  k: { r: '帅', b: '将' },
  c: { r: '炮', b: '砲' },
  s: { r: '兵', b: '卒' },
};

// Initial board position (FEN-like format)
// Red (r) is at bottom, Black (b) is at top
const INITIAL_POSITION = 'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR';

class Xiangqi {
  constructor(fen = INITIAL_POSITION) {
    this.board = this.createEmptyBoard();
    this.turn = 'r'; // 'r' for red, 'b' for black
    this.history = [];
    this.moveHistory = [];
    this.loadFEN(fen);
  }

  createEmptyBoard() {
    const board = [];
    for (let row = 0; row < 10; row++) {
      board[row] = [];
      for (let col = 0; col < 9; col++) {
        board[row][col] = null;
      }
    }
    return board;
  }

  loadFEN(fen) {
    this.board = this.createEmptyBoard();
    this.history = [];
    this.moveHistory = [];
    const rows = fen.split('/');

    for (let row = 0; row < 10 && row < rows.length; row++) {
      let col = 0;
      for (const char of rows[row]) {
        if (col >= 9) break;

        if (/\d/.test(char)) {
          col += parseInt(char);
        } else {
          const color = char === char.toUpperCase() ? 'r' : 'b';
          const type = char.toLowerCase();
          this.board[row][col] = { type, color };
          col++;
        }
      }
    }
  }

  toFEN() {
    let fen = '';
    for (let row = 0; row < 10; row++) {
      let empty = 0;
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (piece) {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          fen += piece.color === 'r' ? piece.type.toUpperCase() : piece.type;
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (row < 9) fen += '/';
    }
    return fen;
  }

  fen() {
    return this.toFEN();
  }

  get(pos) {
    if (typeof pos === 'string') {
      pos = this.parsePosition(pos);
    }
    if (!pos || !this.isValidPosition(pos.row, pos.col)) return null;
    return this.board[pos.row][pos.col];
  }

  parsePosition(pos) {
    if (!pos || pos.length < 2) return null;
    const col = pos.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 9 - parseInt(pos.slice(1));
    if (this.isValidPosition(row, col)) {
      return { row, col };
    }
    return null;
  }

  positionToString(row, col) {
    return String.fromCharCode('a'.charCodeAt(0) + col) + (9 - row);
  }

  isValidPosition(row, col) {
    return row >= 0 && row < 10 && col >= 0 && col < 9;
  }

  // Check if position is in the palace (九宫)
  isInPalace(row, col, color) {
    if (col < 3 || col > 5) return false;
    if (color === 'r') {
      return row >= 7 && row <= 9;
    } else {
      return row >= 0 && row <= 2;
    }
  }

  // Check if position is on own side (for elephants)
  isOnOwnSide(row, color) {
    if (color === 'r') {
      return row >= 5;
    } else {
      return row <= 4;
    }
  }

  // Get all valid moves for a piece at given position
  getValidMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];

    let moves = [];

    switch (piece.type) {
      case 'k': // General
        moves = this.getGeneralMoves(row, col, piece.color);
        break;
      case 'a': // Advisor
        moves = this.getAdvisorMoves(row, col, piece.color);
        break;
      case 'e': // Elephant
        moves = this.getElephantMoves(row, col, piece.color);
        break;
      case 'h': // Horse
        moves = this.getHorseMoves(row, col, piece.color);
        break;
      case 'r': // Chariot
        moves = this.getChariotMoves(row, col, piece.color);
        break;
      case 'c': // Cannon
        moves = this.getCannonMoves(row, col, piece.color);
        break;
      case 's': // Soldier
        moves = this.getSoldierMoves(row, col, piece.color);
        break;
    }

    // Filter out moves that would put own general in check
    return moves.filter(move => {
      const testBoard = this.cloneBoard();
      testBoard[move.row][move.col] = testBoard[row][col];
      testBoard[row][col] = null;
      return !this.isInCheckWithBoard(piece.color, testBoard);
    });
  }

  getGeneralMoves(row, col, color) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (this.isInPalace(newRow, newCol, color)) {
        const target = this.board[newRow][newCol];
        if (!target || target.color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }

    // Flying general rule: can capture opposing general if no pieces between them
    const opponentColor = color === 'r' ? 'b' : 'r';
    const generalPos = this.findGeneral(opponentColor);
    if (generalPos && generalPos.col === col) {
      let hasBlocker = false;
      const minRow = Math.min(row, generalPos.row);
      const maxRow = Math.max(row, generalPos.row);
      for (let r = minRow + 1; r < maxRow; r++) {
        if (this.board[r][col]) {
          hasBlocker = true;
          break;
        }
      }
      if (!hasBlocker) {
        moves.push({ row: generalPos.row, col: generalPos.col });
      }
    }

    return moves;
  }

  getAdvisorMoves(row, col, color) {
    const moves = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (this.isInPalace(newRow, newCol, color)) {
        const target = this.board[newRow][newCol];
        if (!target || target.color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }

    return moves;
  }

  getElephantMoves(row, col, color) {
    const moves = [];
    const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
    const blocks = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (let i = 0; i < directions.length; i++) {
      const [dr, dc] = directions[i];
      const [br, bc] = blocks[i];
      const newRow = row + dr;
      const newCol = col + dc;
      const blockRow = row + br;
      const blockCol = col + bc;

      if (this.isValidPosition(newRow, newCol) &&
          this.isOnOwnSide(newRow, color) &&
          !this.board[blockRow][blockCol]) {
        const target = this.board[newRow][newCol];
        if (!target || target.color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }

    return moves;
  }

  getHorseMoves(row, col, color) {
    const moves = [];
    // Horse moves in L-shape, but can be blocked at the first step
    const movePatterns = [
      { block: [-1, 0], moves: [[-2, -1], [-2, 1]] },
      { block: [1, 0], moves: [[2, -1], [2, 1]] },
      { block: [0, -1], moves: [[-1, -2], [1, -2]] },
      { block: [0, 1], moves: [[-1, 2], [1, 2]] },
    ];

    for (const pattern of movePatterns) {
      const blockRow = row + pattern.block[0];
      const blockCol = col + pattern.block[1];

      if (this.isValidPosition(blockRow, blockCol) && !this.board[blockRow][blockCol]) {
        for (const [dr, dc] of pattern.moves) {
          const newRow = row + dr;
          const newCol = col + dc;

          if (this.isValidPosition(newRow, newCol)) {
            const target = this.board[newRow][newCol];
            if (!target || target.color !== color) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        }
      }
    }

    return moves;
  }

  getChariotMoves(row, col, color) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      let newRow = row + dr;
      let newCol = col + dc;

      while (this.isValidPosition(newRow, newCol)) {
        const target = this.board[newRow][newCol];
        if (!target) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if (target.color !== color) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
        newRow += dr;
        newCol += dc;
      }
    }

    return moves;
  }

  getCannonMoves(row, col, color) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      let newRow = row + dr;
      let newCol = col + dc;
      let foundPlatform = false;

      while (this.isValidPosition(newRow, newCol)) {
        const target = this.board[newRow][newCol];

        if (!foundPlatform) {
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            foundPlatform = true;
          }
        } else {
          if (target) {
            if (target.color !== color) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
        newRow += dr;
        newCol += dc;
      }
    }

    return moves;
  }

  getSoldierMoves(row, col, color) {
    const moves = [];

    // Determine if soldier has crossed the river
    const crossedRiver = color === 'r' ? row <= 4 : row >= 5;

    // Forward direction
    const forward = color === 'r' ? -1 : 1;

    // Can always move forward
    const newRow = row + forward;
    if (this.isValidPosition(newRow, col)) {
      const target = this.board[newRow][col];
      if (!target || target.color !== color) {
        moves.push({ row: newRow, col });
      }
    }

    // After crossing river, can also move sideways
    if (crossedRiver) {
      for (const dc of [-1, 1]) {
        const newCol = col + dc;
        if (this.isValidPosition(row, newCol)) {
          const target = this.board[row][newCol];
          if (!target || target.color !== color) {
            moves.push({ row, col: newCol });
          }
        }
      }
    }

    return moves;
  }

  findGeneral(color) {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === 'k' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  cloneBoard() {
    const newBoard = [];
    for (let row = 0; row < 10; row++) {
      newBoard[row] = [];
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        newBoard[row][col] = piece ? { ...piece } : null;
      }
    }
    return newBoard;
  }

  isInCheckWithBoard(color, board) {
    // Find general position
    let generalPos = null;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'k' && piece.color === color) {
          generalPos = { row, col };
          break;
        }
      }
      if (generalPos) break;
    }

    if (!generalPos) return true; // No general means in check (captured)

    const opponentColor = color === 'r' ? 'b' : 'r';

    // Check if any opponent piece can capture the general
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = board[row][col];
        if (piece && piece.color === opponentColor) {
          const moves = this.getPseudoLegalMoves(row, col, piece, board);
          if (moves.some(m => m.row === generalPos.row && m.col === generalPos.col)) {
            return true;
          }
        }
      }
    }

    // Check flying general rule
    const opponentGeneral = this.findGeneralInBoard(opponentColor, board);
    if (opponentGeneral && opponentGeneral.col === generalPos.col) {
      let hasBlocker = false;
      const minRow = Math.min(generalPos.row, opponentGeneral.row);
      const maxRow = Math.max(generalPos.row, opponentGeneral.row);
      for (let r = minRow + 1; r < maxRow; r++) {
        if (board[r][generalPos.col]) {
          hasBlocker = true;
          break;
        }
      }
      if (!hasBlocker) return true;
    }

    return false;
  }

  findGeneralInBoard(color, board) {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'k' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  // Get moves without checking for self-check (for performance in check detection)
  getPseudoLegalMoves(row, col, piece, board) {
    const moves = [];
    const color = piece.color;

    switch (piece.type) {
      case 'k':
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (this.isInPalace(newRow, newCol, color)) {
            const target = board[newRow][newCol];
            if (!target || target.color !== color) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        }
        break;

      case 'a':
        const aDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of aDirs) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (this.isInPalace(newRow, newCol, color)) {
            const target = board[newRow][newCol];
            if (!target || target.color !== color) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        }
        break;

      case 'e':
        const eDirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
        const eBlocks = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (let i = 0; i < eDirs.length; i++) {
          const [dr, dc] = eDirs[i];
          const [br, bc] = eBlocks[i];
          const newRow = row + dr;
          const newCol = col + dc;
          if (this.isValidPosition(newRow, newCol) &&
              this.isOnOwnSide(newRow, color) &&
              !board[row + br][col + bc]) {
            const target = board[newRow][newCol];
            if (!target || target.color !== color) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        }
        break;

      case 'h':
        const hPatterns = [
          { block: [-1, 0], moves: [[-2, -1], [-2, 1]] },
          { block: [1, 0], moves: [[2, -1], [2, 1]] },
          { block: [0, -1], moves: [[-1, -2], [1, -2]] },
          { block: [0, 1], moves: [[-1, 2], [1, 2]] },
        ];
        for (const pattern of hPatterns) {
          const blockRow = row + pattern.block[0];
          const blockCol = col + pattern.block[1];
          if (this.isValidPosition(blockRow, blockCol) && !board[blockRow][blockCol]) {
            for (const [dr, dc] of pattern.moves) {
              const newRow = row + dr;
              const newCol = col + dc;
              if (this.isValidPosition(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (!target || target.color !== color) {
                  moves.push({ row: newRow, col: newCol });
                }
              }
            }
          }
        }
        break;

      case 'r':
        const rDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of rDirs) {
          let newRow = row + dr;
          let newCol = col + dc;
          while (this.isValidPosition(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (!target) {
              moves.push({ row: newRow, col: newCol });
            } else {
              if (target.color !== color) {
                moves.push({ row: newRow, col: newCol });
              }
              break;
            }
            newRow += dr;
            newCol += dc;
          }
        }
        break;

      case 'c':
        const cDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of cDirs) {
          let newRow = row + dr;
          let newCol = col + dc;
          let foundPlatform = false;
          while (this.isValidPosition(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (!foundPlatform) {
              if (!target) {
                moves.push({ row: newRow, col: newCol });
              } else {
                foundPlatform = true;
              }
            } else {
              if (target) {
                if (target.color !== color) {
                  moves.push({ row: newRow, col: newCol });
                }
                break;
              }
            }
            newRow += dr;
            newCol += dc;
          }
        }
        break;

      case 's':
        const crossedRiver = color === 'r' ? row <= 4 : row >= 5;
        const forward = color === 'r' ? -1 : 1;
        const fRow = row + forward;
        if (this.isValidPosition(fRow, col)) {
          const target = board[fRow][col];
          if (!target || target.color !== color) {
            moves.push({ row: fRow, col });
          }
        }
        if (crossedRiver) {
          for (const dc of [-1, 1]) {
            const newCol = col + dc;
            if (this.isValidPosition(row, newCol)) {
              const target = board[row][newCol];
              if (!target || target.color !== color) {
                moves.push({ row, col: newCol });
              }
            }
          }
        }
        break;
    }

    return moves;
  }

  in_check() {
    return this.isInCheckWithBoard(this.turn, this.board);
  }

  in_checkmate() {
    if (!this.in_check()) return false;
    return this.moves().length === 0;
  }

  in_stalemate() {
    if (this.in_check()) return false;
    return this.moves().length === 0;
  }

  game_over() {
    return this.in_checkmate() || this.in_stalemate();
  }

  // Get all legal moves for current player
  moves(options = {}) {
    const allMoves = [];
    const verbose = options.verbose || false;

    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === this.turn) {
          const moves = this.getValidMoves(row, col);
          for (const move of moves) {
            const from = this.positionToString(row, col);
            const to = this.positionToString(move.row, move.col);
            const captured = this.board[move.row][move.col];

            if (verbose) {
              allMoves.push({
                from,
                to,
                piece: piece.type,
                color: piece.color,
                captured: captured ? captured.type : null,
                san: this.toSAN(row, col, move.row, move.col, piece, captured),
              });
            } else {
              allMoves.push({ from, to });
            }
          }
        }
      }
    }

    // Filter by square if specified
    if (options.square) {
      const pos = this.parsePosition(options.square);
      if (pos) {
        return allMoves.filter(m => {
          const fromPos = this.parsePosition(m.from);
          return fromPos && fromPos.row === pos.row && fromPos.col === pos.col;
        });
      }
    }

    return allMoves;
  }

  toSAN(fromRow, fromCol, toRow, toCol, piece, captured) {
    const pieceName = PIECE_NAMES[piece.type][piece.color];
    const fromStr = this.positionToString(fromRow, fromCol);
    const toStr = this.positionToString(toRow, toCol);
    const captureStr = captured ? 'x' : '-';
    return `${pieceName}${fromStr}${captureStr}${toStr}`;
  }

  move(moveObj) {
    let from, to;

    if (typeof moveObj === 'string') {
      // Parse string like "e0-e1" or "炮e0-e1"
      const match = moveObj.match(/([a-i]\d+)[x\-]?([a-i]\d+)/i);
      if (match) {
        from = match[1].toLowerCase();
        to = match[2].toLowerCase();
      } else {
        return null;
      }
    } else if (moveObj.from && moveObj.to) {
      from = moveObj.from;
      to = moveObj.to;
    } else {
      return null;
    }

    const fromPos = this.parsePosition(from);
    const toPos = this.parsePosition(to);

    if (!fromPos || !toPos) return null;

    const piece = this.board[fromPos.row][fromPos.col];
    if (!piece || piece.color !== this.turn) return null;

    // Check if move is valid
    const validMoves = this.getValidMoves(fromPos.row, fromPos.col);
    const isValid = validMoves.some(m => m.row === toPos.row && m.col === toPos.col);

    if (!isValid) return null;

    // Make the move
    const captured = this.board[toPos.row][toPos.col];
    const san = this.toSAN(fromPos.row, fromPos.col, toPos.row, toPos.col, piece, captured);

    // Save state for undo
    this.history.push({
      board: this.cloneBoard(),
      turn: this.turn,
    });

    this.board[toPos.row][toPos.col] = piece;
    this.board[fromPos.row][fromPos.col] = null;

    const moveRecord = {
      from,
      to,
      piece: piece.type,
      color: piece.color,
      captured: captured ? captured.type : null,
      san,
    };

    this.moveHistory.push(moveRecord);
    this.turn = this.turn === 'r' ? 'b' : 'r';

    return moveRecord;
  }

  undo() {
    if (this.history.length === 0) return null;

    const lastState = this.history.pop();
    const lastMove = this.moveHistory.pop();

    this.board = lastState.board;
    this.turn = lastState.turn;

    return lastMove;
  }

  reset() {
    this.loadFEN(INITIAL_POSITION);
    this.turn = 'r';
    this.history = [];
    this.moveHistory = [];
  }

  // Alias for compatibility
  history_moves() {
    return [...this.moveHistory];
  }

  turn_color() {
    return this.turn;
  }

  ascii() {
    let str = '   a b c d e f g h i\n';
    str += '  +-----------------+\n';

    for (let row = 0; row < 10; row++) {
      str += `${9 - row} |`;
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (piece) {
          str += PIECE_NAMES[piece.type][piece.color];
        } else {
          // Show river
          if (row === 4 || row === 5) {
            str += '~';
          } else {
            str += '.';
          }
        }
        if (col < 8) str += ' ';
      }
      str += `| ${9 - row}\n`;

      // River
      if (row === 4) {
        str += '  |=== 楚河  汉界 ===|\n';
      }
    }

    str += '  +-----------------+\n';
    str += '   a b c d e f g h i\n';
    return str;
  }
}

export default Xiangqi;
export { PIECES, PIECE_NAMES, INITIAL_POSITION };
