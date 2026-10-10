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

    // Filter out moves that would put own general in check.
    // Make/unmake in place on the real board (no per-move board copy).
    const board = this.board;
    return moves.filter(move => {
      const captured = board[move.row][move.col];
      board[move.row][move.col] = piece;
      board[row][col] = null;
      const illegal = this.isGeneralAttacked(piece.color, board);
      board[row][col] = piece;
      board[move.row][move.col] = captured;
      return !illegal;
    });
  }

  // Fast check test: is `color`'s general attacked on `board`?
  // Looks outward from the general instead of generating every enemy move.
  isGeneralAttacked(color, board) {
    const r0 = color === 'r' ? 7 : 0;
    let gr = -1;
    let gc = -1;
    for (let r = r0; r < r0 + 3 && gr < 0; r++) {
      for (let c = 3; c <= 5; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) {
          gr = r;
          gc = c;
          break;
        }
      }
    }
    if (gr < 0) {
      // Not in its palace (e.g. just captured the facing general, or a custom
      // position): fall back to a full-board scan
      for (let r = 0; r < 10 && gr < 0; r++) {
        for (let c = 0; c < 9; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === color) {
            gr = r;
            gc = c;
            break;
          }
        }
      }
    }
    if (gr < 0) return true; // general captured / missing

    const enemy = color === 'r' ? 'b' : 'r';

    // Chariot, cannon (needs exactly one screen) and flying general
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let r = gr + dr;
      let c = gc + dc;
      let screen = false;
      while (r >= 0 && r < 10 && c >= 0 && c < 9) {
        const p = board[r][c];
        if (p) {
          if (!screen) {
            if (p.color === enemy) {
              if (p.type === 'r') return true;
              if (p.type === 'k' && dc === 0) return true;
            }
            screen = true;
          } else {
            if (p.color === enemy && p.type === 'c') return true;
            break;
          }
        }
        r += dr;
        c += dc;
      }
    }

    // Horse: attacker at G+(a,b), blocked by the leg square next to the horse
    const horseOffsets = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
    for (const [a, b] of horseOffsets) {
      const hr = gr + a;
      const hc = gc + b;
      if (hr < 0 || hr > 9 || hc < 0 || hc > 8) continue;
      const h = board[hr][hc];
      if (!h || h.type !== 'h' || h.color !== enemy) continue;
      const legR = hr + (Math.abs(a) === 2 ? -Math.sign(a) : 0);
      const legC = hc + (Math.abs(b) === 2 ? -Math.sign(b) : 0);
      if (!board[legR][legC]) return true;
    }

    // Soldier: from "behind" (it moves toward the general) or from the side once crossed
    const fwdRow = enemy === 'r' ? gr + 1 : gr - 1;
    if (fwdRow >= 0 && fwdRow < 10) {
      const p = board[fwdRow][gc];
      if (p && p.type === 's' && p.color === enemy) return true;
    }
    const crossed = enemy === 'r' ? gr <= 4 : gr >= 5;
    if (crossed) {
      for (const dc of [-1, 1]) {
        const c = gc + dc;
        if (c < 0 || c > 8) continue;
        const p = board[gr][c];
        if (p && p.type === 's' && p.color === enemy) return true;
      }
    }

    return false;
  }

  // Why can't the piece on (fromRow, fromCol) go to (toRow, toCol)?
  // Returns { zh, en } or null when there is nothing useful to say.
  explainIllegalMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (!piece) return null;
    const target = this.board[toRow][toCol];
    if (target && target.color === piece.color) return null;
    if (fromRow === toRow && fromCol === toCol) return null;

    const dr = toRow - fromRow;
    const dc = toCol - fromCol;
    const adr = Math.abs(dr);
    const adc = Math.abs(dc);
    const sign = Math.sign;

    const reachable = this.getPseudoLegalMoves(fromRow, fromCol, piece, this.board)
      .some(m => m.row === toRow && m.col === toCol);
    if (reachable) {
      return {
        zh: '这步会让你的将/帅被将军，或与对方将帅直接照面',
        en: 'That would leave your general in check or facing the enemy general',
      };
    }

    switch (piece.type) {
      case 'h': {
        const lShape = (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
        if (!lShape) return { zh: '马走"日"字：先直走一格，再斜走一格', en: 'The horse moves in an L-shape' };
        const legR = adr === 2 ? fromRow + sign(dr) : fromRow;
        const legC = adr === 2 ? fromCol : fromCol + sign(dc);
        if (this.board[legR][legC]) return { zh: '蹩马腿：马前进方向的第一格被挡住了', en: 'Blocked: a piece sits on the horse\'s first step' };
        return null;
      }
      case 'e': {
        if (adr !== 2 || adc !== 2) return { zh: '象走"田"字：斜着走两格', en: 'The elephant moves exactly two squares diagonally' };
        if (!this.isOnOwnSide(toRow, piece.color)) return { zh: '象不能过河', en: 'The elephant cannot cross the river' };
        if (this.board[fromRow + sign(dr)][fromCol + sign(dc)]) return { zh: '塞象眼：田字中心有棋子', en: 'Blocked: a piece sits in the elephant\'s eye' };
        return null;
      }
      case 'a':
        if (adr !== 1 || adc !== 1) return { zh: '仕/士只能斜走一格', en: 'The advisor moves one square diagonally' };
        return { zh: '仕/士不能离开九宫', en: 'The advisor must stay inside the palace' };
      case 'k':
        if (adr + adc !== 1) return { zh: '帅/将每次只能直走一格', en: 'The general moves one square orthogonally' };
        return { zh: '帅/将不能离开九宫', en: 'The general must stay inside the palace' };
      case 'r':
        if (dr !== 0 && dc !== 0) return { zh: '车只能走直线', en: 'The chariot moves in straight lines' };
        return { zh: '车不能越过其他棋子', en: 'The chariot cannot jump over pieces' };
      case 'c': {
        if (dr !== 0 && dc !== 0) return { zh: '炮只能走直线', en: 'The cannon moves in straight lines' };
        if (!target) return { zh: '炮走子时不能越过棋子', en: 'The cannon cannot jump when it is not capturing' };
        return { zh: '炮吃子必须隔着恰好一个棋子（炮架）', en: 'The cannon must jump exactly one piece (the screen) to capture' };
      }
      case 's': {
        const forward = piece.color === 'r' ? -1 : 1;
        if (dr === -forward) return { zh: '兵/卒不能后退', en: 'Soldiers never move backward' };
        if (dr === 0 && adc === 1) return { zh: '兵/卒过河后才能横走', en: 'Soldiers can only move sideways after crossing the river' };
        return { zh: '兵/卒每次只能走一格', en: 'Soldiers move one square at a time' };
      }
      default:
        return null;
    }
  }

  // Legal moves as plain coordinates, for the search (no strings / SAN)
  generateMoves() {
    const out = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.turn) continue;
        for (const m of this.getValidMoves(row, col)) {
          out.push({ fr: row, fc: col, tr: m.row, tc: m.col, piece: piece.type, captured: this.board[m.row][m.col] });
        }
      }
    }
    return out;
  }

  // Apply / revert a move from generateMoves() in place (no history, no validation)
  makeRaw(m) {
    this.board[m.tr][m.tc] = this.board[m.fr][m.fc];
    this.board[m.fr][m.fc] = null;
    this.turn = this.turn === 'r' ? 'b' : 'r';
  }

  unmakeRaw(m) {
    this.board[m.fr][m.fc] = this.board[m.tr][m.tc];
    this.board[m.tr][m.tc] = m.captured;
    this.turn = this.turn === 'r' ? 'b' : 'r';
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
    return this.isGeneralAttacked(color, board);
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
