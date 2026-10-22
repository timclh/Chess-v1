/**
 * Coming back to a saved xiangqi game: the move list and undo cover the whole game, not only
 * what was played after the page was reloaded (it used to restart at "1." mid-game).
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import Xiangqi from './xiangqi';

jest.mock('./services/SoundService', () => ({
  ...jest.requireActual('./services/SoundService'),
  initSound: () => {},
  playSound: () => true,
}));

jest.mock('./services/XiangqiCoachService', () => ({
  initCoachEngine: async () => true,
  isEngineReady: () => false,
  isNetworkActive: () => false,
  getTopMovesEngine: async () => null,
  analyzePositionEngine: async () => null,
  stopAnalysis: () => {},
  destroyEngine: () => {},
  clearAnalysisCache: () => {},
  prewarmEngine: () => {},
  shouldPrewarmOnStart: () => false,
  prewarmOnIntent: {},
}));

// eslint-disable-next-line import/first
import XiangqiGame, { restoreSavedGame } from './XiangqiGame';

const OPENING = [
  { from: 'h2', to: 'e2' }, // red cannon to the centre
  { from: 'h9', to: 'g7' }, // black horse
  { from: 'h0', to: 'g2' },
  { from: 'i9', to: 'h9' },
];

function played(moves) {
  const g = new Xiangqi();
  moves.forEach((m) => g.move(m));
  return g;
}

// what is saved to localStorage: JSON, so plain objects
const snapshot = (g, extra = {}) => JSON.parse(JSON.stringify({
  fen: g.toFEN(), turn: g.turn, history: g.history_moves(), gameMode: 'ai', playerColor: 'r', aiDifficulty: 2, savedAt: Date.now(), ...extra,
}));

describe('restoreSavedGame', () => {
  test('replays the saved moves, so the list and undo cover the whole game', () => {
    const saved = snapshot(played(OPENING));
    const fresh = new Xiangqi();

    expect(restoreSavedGame(fresh, saved)).toBe(true);

    expect(fresh.toFEN()).toBe(saved.fen);
    expect(fresh.turn).toBe(saved.turn);
    expect(fresh.history_moves().map((m) => m.san)).toEqual(saved.history.map((m) => m.san));
    // and the moves from before the reload can be taken back
    OPENING.forEach(() => expect(fresh.undo()).not.toBeNull());
    expect(fresh.toFEN()).toBe(new Xiangqi().toFEN());
  });

  test('a game whose moves do not lead to the saved position loads the position only', () => {
    const saved = snapshot(played(OPENING));
    saved.history[1] = { from: 'a9', to: 'a1' }; // not a legal reply
    const fresh = new Xiangqi();

    expect(restoreSavedGame(fresh, saved)).toBe(false);

    expect(fresh.toFEN()).toBe(saved.fen);
    expect(fresh.turn).toBe(saved.turn);
    expect(fresh.history_moves()).toEqual([]); // nothing half-replayed is left behind
  });

  test('a list that is shorter than the game (saved by an older version) loads the position only', () => {
    const g = played(OPENING);
    const saved = snapshot(g);
    saved.history = saved.history.slice(2); // the list had restarted after a reload
    const fresh = new Xiangqi();

    expect(restoreSavedGame(fresh, saved)).toBe(false);
    expect(fresh.toFEN()).toBe(saved.fen);
  });

  test('nothing saved to replay loads the position', () => {
    const saved = snapshot(new Xiangqi());
    const fresh = new Xiangqi();
    expect(restoreSavedGame(fresh, saved)).toBe(false);
    expect(fresh.toFEN()).toBe(saved.fen);
  });
});

describe('XiangqiGame after a reload', () => {
  let container;

  beforeEach(() => {
    localStorage.clear();
    window.innerWidth = 1024;
    Object.defineProperty(window, 'crossOriginIsolated', { value: true, configurable: true });
  });

  afterEach(async () => {
    await act(async () => { ReactDOM.unmountComponentAtNode(container); });
    container.remove();
  });

  async function mount() {
    container = document.createElement('div');
    document.body.appendChild(container);
    const ref = React.createRef();
    await act(async () => { ReactDOM.render(<XiangqiGame ref={ref} />, container); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    return ref.current;
  }

  test('the move list shows the whole game and keeps counting from there', async () => {
    localStorage.setItem('xiangqi_game_state', JSON.stringify(snapshot(played(OPENING), { gameMode: 'human' })));

    const game = await mount();
    expect(game.state.history).toHaveLength(4);
    expect(container.textContent).toContain('1.');

    await act(async () => { game.handleMove({ from: 'b0', to: 'c2' }); });

    expect(game.state.history).toHaveLength(5); // it used to restart at 1
    expect(game.state.history.map((m) => m.san)[0]).toBe(snapshot(played(OPENING)).history[0].san);
  });
});
