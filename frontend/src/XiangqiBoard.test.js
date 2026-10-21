/**
 * Xiangqi board: a piece that moved slides from its old square (FLIP animation),
 * unless it was dropped by dragging, and a position that changes in any other
 * way (new game, several pieces) just appears.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import XiangqiBoard, { detectSingleMove } from './XiangqiBoard';

const empty = () => Array.from({ length: 10 }, () => Array(9).fill(null));
const piece = (type, color) => ({ type, color });

function boardWith(pieces) {
  const b = empty();
  pieces.forEach(([row, col, type, color]) => { b[row][col] = piece(type, color); });
  return b;
}

describe('detectSingleMove', () => {
  const rook = [9, 0, 'r', 'r'];
  const king = [9, 4, 'k', 'r'];
  const enemyKing = [0, 4, 'k', 'b'];

  test('finds a plain move', () => {
    const snap = (pieces) => boardWith(pieces).map((row) => row.map((p) => (p ? p.type + p.color : '')));
    const move = detectSingleMove(snap([rook, king, enemyKing]), snap([[5, 0, 'r', 'r'], king, enemyKing]));
    expect(move).toEqual({ from: { row: 9, col: 0 }, to: { row: 5, col: 0 } });
  });

  test('finds a capture (destination held an enemy piece)', () => {
    const snap = (pieces) => boardWith(pieces).map((row) => row.map((p) => (p ? p.type + p.color : '')));
    const move = detectSingleMove(
      snap([rook, king, enemyKing, [5, 0, 'c', 'b']]),
      snap([[5, 0, 'r', 'r'], king, enemyKing]),
    );
    expect(move).toEqual({ from: { row: 9, col: 0 }, to: { row: 5, col: 0 } });
  });

  test('ignores a new game, an unchanged board and missing data', () => {
    const snap = (pieces) => boardWith(pieces).map((row) => row.map((p) => (p ? p.type + p.color : '')));
    const a = snap([rook, king, enemyKing]);
    expect(detectSingleMove(a, a)).toBeNull();
    expect(detectSingleMove(a, snap([king]))).toBeNull();
    expect(detectSingleMove(null, a)).toBeNull();
    expect(detectSingleMove(a, null)).toBeNull();
  });
});

describe('XiangqiBoard slide animation', () => {
  let container;
  let animateCalls;
  const realAnimate = Element.prototype.animate;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    animateCalls = [];
    Element.prototype.animate = function animate(frames, opts) {
      animateCalls.push({ sq: this.getAttribute('data-sq'), frames, opts });
      return {};
    };
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    Element.prototype.animate = realAnimate;
  });

  const before = [[9, 0, 'r', 'r'], [9, 4, 'k', 'r'], [0, 4, 'k', 'b']];
  const after = [[5, 0, 'r', 'r'], [9, 4, 'k', 'r'], [0, 4, 'k', 'b']];

  function render(board, ref) {
    act(() => {
      ReactDOM.render(<XiangqiBoard ref={ref} board={board} turn="r" playerColor="r" width={450} />, container);
    });
  }

  test('animates the moved piece from its old square', () => {
    render(boardWith(before));
    render(boardWith(after));
    expect(animateCalls).toHaveLength(1);
    const { sq, frames } = animateCalls[0];
    expect(sq).toBe('5-0');
    // starts four rows (4 * 50px) below its new square, ends in place
    expect(frames[0].transform).toContain('translate(0px, 200px)');
    expect(frames[frames.length - 1].transform).toContain('translate(0, 0)');
  });

  test('does not animate the first render or an unchanged board', () => {
    render(boardWith(before));
    render(boardWith(before));
    expect(animateCalls).toHaveLength(0);
  });

  test('does not animate a piece dropped by dragging', () => {
    const ref = React.createRef();
    render(boardWith(before), ref);
    ref.current._dragDropAt = Date.now();
    render(boardWith(after), ref);
    expect(animateCalls).toHaveLength(0);
  });
});
