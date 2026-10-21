/**
 * ViewportService — Auto-optimization for mobile app layout
 *
 * Stores all app chrome dimensions and provides helpers to calculate
 * available content area on any screen size. Used by components to
 * auto-fit boards, cards, and page layouts without hardcoding.
 *
 * Usage:
 *   import { getAvailable, fitSquare, fitColumns } from './services/ViewportService';
 *   const { width, height } = getAvailable();
 *   const boardSize = fitSquare();          // largest square that fits
 *   const cardWidth = fitColumns(3, 8);     // 3 columns with 8px gap
 */

// ─── App Chrome Dimensions (px) ──────────────────────────────────────────

const CHROME = {
  // Top header bar
  header: 40,
  // Sub-navigation pills bar (game selector / learn tabs)
  subNav: 36,
  // Bottom tab bar (including safe area)
  tabBar: 56,
  // Android/iOS status bar
  statusBar: 0, // Capacitor handles this via safe-area-inset-top
  // Extra breathing room
  padding: 16,
};

// On wide screens the main tabs live in the header and the bottom bar is hidden
// (the 821px matches the CSS breakpoint in App.css).
export const WIDE_NAV_MIN_WIDTH = 821;
const tabBarHeight = (vw) => (vw >= WIDE_NAV_MIN_WIDTH ? 0 : CHROME.tabBar);

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Get the usable content area dimensions (after subtracting all app chrome).
 * @param {Object} opts
 * @param {boolean} opts.hasSubNav - Whether sub-nav is visible (default: false)
 * @param {number}  opts.extraChrome - Additional vertical chrome to subtract (status text, controls)
 * @param {number}  opts.maxSize - Largest board side fitSquare may return (default 520)
 * @returns {{ width: number, height: number }}
 */
export function getAvailable(opts = {}) {
  const { hasSubNav = false, extraChrome = 0 } = opts;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const verticalChrome =
    CHROME.header +
    tabBarHeight(vw) +
    CHROME.padding +
    extraChrome +
    (hasSubNav ? CHROME.subNav : 0);

  return {
    width: vw - CHROME.padding,
    height: vh - verticalChrome,
  };
}

/**
 * Calculate the largest square that fits the available area.
 * Used for chess/xiangqi/gomoku boards.
 * @param {Object} opts - Same as getAvailable opts
 * @returns {number} side length in px
 */
export function fitSquare(opts = {}) {
  const { width, height } = getAvailable(opts);
  const { maxSize = 520 } = opts; // cap for desktop
  return Math.min(width, height, maxSize);
}

// Chess on wide screens puts the player bars, toolbar and move list beside the board
// (see App.css), so the board only has to leave room for the header and padding.
export const CHESS_SIDE_COLUMN_MIN_WIDTH = 1100;
export function chessBoardOptions(vw = window.innerWidth) {
  const wide = vw >= CHESS_SIDE_COLUMN_MIN_WIDTH;
  return { hasSubNav: true, extraChrome: wide ? 120 : 260, maxSize: wide ? 580 : 520 };
}

/** Tilt of the xiangqi board in degrees: gentler on phones, where touch accuracy matters. */
export function boardTiltDegrees(vw = window.innerWidth) {
  return vw <= 820 ? 8 : 16;
}

/**
 * Xiangqi board width (the board is 9:10). On phones it follows the width; on wide
 * screens it is also limited by the viewport height so the whole board is visible
 * without scrolling (header, sub-nav, page padding, status line and panel padding
 * take about 270px, plus a little margin below the board).
 * @returns {number} board width in px
 */
export function fitXiangqiBoard(vw = window.innerWidth, vh = window.innerHeight) {
  if (vw <= 820) return Math.min(450, vw - 40);
  return Math.max(320, Math.min(540, Math.floor((vh - 290) * 0.9), vw - 40));
}

/**
 * Board width for pages that sit inside padded panels: as wide as `max`, but
 * never wider than the screen minus `gutter` (page + panel padding), so the
 * page cannot scroll sideways on a phone.
 * @param {number} max    - Desktop width in px
 * @param {number} gutter - Horizontal space taken by padding around the board
 * @param {number} [screenWidth] - Defaults to window.innerWidth
 * @returns {number} board width in px
 */
export function fitBoardWidth(max, gutter = 72, screenWidth = window.innerWidth) {
  return Math.max(240, Math.min(max, screenWidth - gutter));
}

/**
 * `calcWidth` prop for chessboardjsx (it re-runs on window resize).
 *   <Chessboard calcWidth={boardCalcWidth(480)} ... />
 */
export function boardCalcWidth(max, gutter = 72) {
  return ({ screenWidth }) => fitBoardWidth(max, gutter, screenWidth);
}

/**
 * Calculate card/column width for a grid layout.
 * @param {number} columns - Number of columns
 * @param {number} gap - Gap between columns in px (default: 8)
 * @returns {number} width per column in px
 */
export function fitColumns(columns = 3, gap = 8) {
  const { width } = getAvailable();
  return Math.floor((width - gap * (columns - 1)) / columns);
}

/**
 * Get the CSS min-height value for a page that should fill the viewport.
 * Apply as: style={{ minHeight: pageMinHeight() }}
 * @param {Object} opts - Same as getAvailable opts
 * @returns {string} CSS value like "calc(100vh - 100px)"
 */
export function pageMinHeight(opts = {}) {
  const { hasSubNav = false, extraChrome = 0 } = opts;
  const chrome =
    CHROME.header +
    tabBarHeight(window.innerWidth) +
    CHROME.padding +
    extraChrome +
    (hasSubNav ? CHROME.subNav : 0);
  return `calc(100vh - ${chrome}px)`;
}

/**
 * Get a resize observer callback that auto-updates a component's state.
 * Usage in componentDidMount:
 *   this._cleanup = autoResize((size) => this.setState({ boardWidth: size }));
 *
 * @param {function} onResize - Called with fitSquare() result on resize
 * @param {Object|function} opts - Options passed to fitSquare (or a function returning them)
 * @returns {function} cleanup function to call in componentWillUnmount
 */
export function autoResize(onResize, opts = {}) {
  // `opts` may be a function so the options can follow the window (e.g. a layout that changes at a breakpoint)
  const handler = () => onResize(fitSquare(typeof opts === 'function' ? opts() : opts));
  handler(); // initial call
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}

/**
 * Get all chrome dimensions (for debugging / copilot reference).
 * @returns {Object} the CHROME constants
 */
export function getChromeInfo() {
  return { ...CHROME };
}

export default {
  getAvailable,
  fitSquare,
  fitXiangqiBoard,
  boardTiltDegrees,
  chessBoardOptions,
  fitBoardWidth,
  boardCalcWidth,
  fitColumns,
  pageMinHeight,
  autoResize,
  getChromeInfo,
};
