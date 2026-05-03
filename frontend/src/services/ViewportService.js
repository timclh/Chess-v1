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

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Get the usable content area dimensions (after subtracting all app chrome).
 * @param {Object} opts
 * @param {boolean} opts.hasSubNav - Whether sub-nav is visible (default: false)
 * @param {number}  opts.extraChrome - Additional vertical chrome to subtract (status text, controls)
 * @returns {{ width: number, height: number }}
 */
export function getAvailable(opts = {}) {
  const { hasSubNav = false, extraChrome = 0 } = opts;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const verticalChrome =
    CHROME.header +
    CHROME.tabBar +
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
  return Math.min(width, height, 520); // cap at 520 for desktop
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
    CHROME.tabBar +
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
 * @param {Object}   opts     - Options passed to fitSquare
 * @returns {function} cleanup function to call in componentWillUnmount
 */
export function autoResize(onResize, opts = {}) {
  const handler = () => onResize(fitSquare(opts));
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
  fitColumns,
  pageMinHeight,
  autoResize,
  getChromeInfo,
};
