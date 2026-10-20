/**
 * Gomoku board: a tap must land on the intersection under the finger even when
 * the SVG has been scaled down to fit a narrow screen (488px of board units
 * drawn into ~370 CSS px on a phone).
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import WuziQiBoard from './WuziQiBoard';
import { BOARD_SIZE, EMPTY } from './wuziqi';

const BOARD_PX = 32 * (BOARD_SIZE - 1) + 20 * 2;

let container;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
});

function mount(onCellClick) {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  act(() => {
    ReactDOM.render(<WuziQiBoard board={board} lastMove={null} onCellClick={onCellClick} disabled={false} />, container);
  });
  return container.querySelector('svg');
}

// jsdom has no layout: pretend the SVG is drawn `shownWidth` px wide at the page origin
function showAtWidth(svg, shownWidth) {
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: shownWidth, height: shownWidth });
}

// Centre of intersection (row, col) in board units
const at = (n) => 20 + n * 32;

test('a click maps to the right intersection at full size', () => {
  const onCellClick = jest.fn();
  const svg = mount(onCellClick);
  showAtWidth(svg, BOARD_PX);
  Simulate.click(svg, { clientX: at(7), clientY: at(3) });
  expect(onCellClick).toHaveBeenCalledWith(3, 7);
});

test('a click maps to the right intersection when the board is scaled down', () => {
  const onCellClick = jest.fn();
  const svg = mount(onCellClick);
  const shown = 370;
  showAtWidth(svg, shown);
  const scale = shown / BOARD_PX;
  Simulate.click(svg, { clientX: at(12) * scale, clientY: at(10) * scale });
  expect(onCellClick).toHaveBeenCalledWith(10, 12);
});

test('a touch maps to the right intersection when the board is scaled down', () => {
  const onCellClick = jest.fn();
  const svg = mount(onCellClick);
  const shown = 300;
  showAtWidth(svg, shown);
  const scale = shown / BOARD_PX;
  Simulate.touchEnd(svg, { changedTouches: [{ clientX: at(2) * scale, clientY: at(13) * scale }] });
  expect(onCellClick).toHaveBeenCalledWith(13, 2);
});
