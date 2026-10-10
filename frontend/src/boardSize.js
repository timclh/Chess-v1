// Responsive board sizing: never wider than the screen minus page/panel padding.
const SIDE_ALLOWANCE = 48;
const MIN_WIDTH = 240;

// For chessboardjsx's `calcWidth` prop
export const calcBoardWidth = (max, extra = 0) => ({ screenWidth }) =>
  Math.min(max, Math.max(MIN_WIDTH, screenWidth - SIDE_ALLOWANCE - extra));

// For our own boards (xiangqi)
// `extra` = additional chrome around the board (e.g. the xiangqi wooden frame)
export const getBoardWidth = (max, extra = 0) =>
  Math.min(max, Math.max(MIN_WIDTH, (typeof window !== 'undefined' ? window.innerWidth : max) - SIDE_ALLOWANCE - extra));
