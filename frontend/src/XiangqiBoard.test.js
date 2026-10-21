/**
 * Xiangqi board: a piece that moved slides from its old square (FLIP animation),
 * unless it was dropped by dragging, and a position that changes in any other
 * way (new game, several pieces) just appears.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
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

describe('XiangqiBoard tilt and drag-and-drop', () => {
  let container;
  const realElementFromPoint = document.elementFromPoint;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    document.elementFromPoint = realElementFromPoint;
  });

  const rookBoard = () => boardWith([[9, 0, 'r', 'r'], [9, 4, 'k', 'r'], [0, 4, 'k', 'b']]);

  function render(props) {
    act(() => {
      ReactDOM.render(<XiangqiBoard board={rookBoard()} turn="r" playerColor="r" width={450} {...props} />, container);
    });
  }

  test('a flat board has no stage perspective or transform', () => {
    render({});
    expect(container.querySelector('.xiangqi-board-stage').classList.contains('tilted')).toBe(false);
    expect(container.querySelector('.xiangqi-board-container').style.transform).toBe('');
  });

  test('a tilted board is rotated back inside a perspective stage', () => {
    render({ tilt: 16 });
    const stage = container.querySelector('.xiangqi-board-stage');
    expect(stage.classList.contains('tilted')).toBe(true);
    expect(stage.style.perspective).not.toBe('');
    expect(container.querySelector('.xiangqi-board-container').style.transform).toBe('rotateX(16deg)');
  });

  test.each([[0], [16]])('every square, empty or occupied, is addressable by board coordinates (tilt %i)', (tilt) => {
    render({ tilt });
    const cells = container.querySelectorAll('[data-sq]');
    // 3 pieces + 87 empty squares
    expect(cells).toHaveLength(90);
    expect(new Set([...cells].map((c) => c.getAttribute('data-sq'))).size).toBe(90);
  });

  test.each([[0], [16]])('dropping a dragged piece uses the square the browser reports under the pointer (tilt %i)', (tilt) => {
    const onMove = jest.fn();
    render({ tilt, onMove, validMoves: [{ row: 5, col: 0 }] });
    const target = container.querySelector('.xiangqi-click-targets [data-sq="5-0"]');
    document.elementFromPoint = jest.fn(() => target);

    Simulate.mouseDown(container.querySelector('.xiangqi-piece[data-sq="9-0"]'), { clientX: 10, clientY: 10 });
    // the dragged piece is drawn on the page, not inside the (possibly tilted) board
    expect(document.body.querySelector('.xiangqi-piece.dragging')).not.toBeNull();
    expect(container.querySelector('.xiangqi-piece.dragging')).toBeNull();

    Simulate.mouseUp(container.querySelector('.xiangqi-board-container'), { clientX: 200, clientY: 200 });
    expect(document.elementFromPoint).toHaveBeenCalledWith(200, 200);
    expect(onMove).toHaveBeenCalledWith({ from: 'a0', to: 'a4' });
    expect(document.body.querySelector('.xiangqi-piece.dragging')).toBeNull();
  });

  test('dropping on something that is not a legal square does nothing', () => {
    const onMove = jest.fn();
    render({ tilt: 16, onMove, validMoves: [{ row: 5, col: 0 }] });
    document.elementFromPoint = jest.fn(() => container.querySelector('.xiangqi-click-targets [data-sq="4-4"]'));
    Simulate.mouseDown(container.querySelector('.xiangqi-piece[data-sq="9-0"]'), { clientX: 10, clientY: 10 });
    Simulate.mouseUp(container.querySelector('.xiangqi-board-container'), { clientX: 5, clientY: 5 });
    expect(onMove).not.toHaveBeenCalled();

    document.elementFromPoint = jest.fn(() => document.body); // off the board entirely
    Simulate.mouseDown(container.querySelector('.xiangqi-piece[data-sq="9-0"]'), { clientX: 10, clientY: 10 });
    Simulate.mouseUp(container.querySelector('.xiangqi-board-container'), { clientX: 5, clientY: 5 });
    expect(onMove).not.toHaveBeenCalled();
  });

  test('without elementFromPoint the flat maths still finds the square, also for a flipped board', () => {
    const ref = React.createRef();
    act(() => {
      ReactDOM.render(<XiangqiBoard ref={ref} board={rookBoard()} turn="r" playerColor="r" width={450} orientation="black" />, container);
    });
    document.elementFromPoint = undefined;
    ref.current.boardRef.current.getBoundingClientRect = () => ({ left: 100, top: 50, width: 450, height: 500 });
    // the top-left corner of a flipped board shows board square row 9, col 8
    expect(ref.current.squareAtPoint(100 + 25, 50 + 25)).toEqual({ row: 9, col: 8 });
    // and the bottom-right corner shows row 0, col 0
    expect(ref.current.squareAtPoint(100 + 425, 50 + 475)).toEqual({ row: 0, col: 0 });
  });

  test('the picked-up piece is marked selected', () => {
    render({ tilt: 16, validMoves: [] });
    Simulate.click(container.querySelector('.xiangqi-piece[data-sq="9-0"]'));
    expect(container.querySelector('.xiangqi-piece[data-sq="9-0"]').classList.contains('selected')).toBe(true);
  });
});
