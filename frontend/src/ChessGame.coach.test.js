/**
 * ChessGame's recommended moves: worked out off the UI thread by the engine, one or two of
 * them, with an "analyzing" state in between, stale answers dropped, the built-in search
 * only as a fallback - plus the 3D (tilted) board preference.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

// chess.js 0.11 only sets `exports.Chess` under Node (webpack's AMD `define` wins in the app)
jest.mock('chess.js', () => jest.requireActual('chess.js').Chess);

// The board itself (drag and drop) is not what is tested here
jest.mock('chessboardjsx', () => ({ __esModule: true, default: () => <div data-testid="board" /> }));

jest.mock('./services/SoundService', () => ({
  ...jest.requireActual('./services/SoundService'),
  initSound: () => {},
  playSound: () => true,
}));

let mockEngineReady = true;
let mockPrewarm = async () => mockEngineReady;
let mockEngineMoves = async () => [];
jest.mock('./services/ChessCoachService', () => ({
  prewarmChessEngine: () => mockPrewarm(),
  isChessEngineReady: () => mockEngineReady,
  getTopMovesEngineChess: (game, n) => mockEngineMoves(game, n),
}));

// eslint-disable-next-line import/first
import ChessGame from './ChessGame';

let container;
let chess; // ChessGame instance

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = (ms = 30) => act(async () => { await sleep(ms); });

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  const ref = React.createRef();
  await act(async () => { ReactDOM.render(<ChessGame ref={ref} />, container); });
  await settle();
  chess = ref.current;
}

const suggestion = (game, san, score = 30) => {
  const move = game.moves({ verbose: true }).find((m) => m.san === san);
  return { rank: 0, move, san, score, winProbability: 0.55, explanation: 'engine', engineDepth: 12, pv: [] };
};

beforeEach(() => {
  localStorage.clear();
  window.innerWidth = 1024;
  Object.defineProperty(window, 'crossOriginIsolated', { value: true, configurable: true });
  mockEngineReady = true;
  mockPrewarm = async () => mockEngineReady;
  mockEngineMoves = async (game) => [suggestion(game, 'e4'), suggestion(game, 'd4', 20)].map((m, i) => ({ ...m, rank: i + 1 }));
});

afterEach(() => {
  jest.useRealTimers();
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
});

describe('recommended moves', () => {
  test('come from the engine, at most two, with the position evaluated by the same search', async () => {
    await mount();
    await settle();

    const { suggestedMoves, coachAnalyzing, analysis } = chess.state;
    expect(coachAnalyzing).toBe(false);
    expect(suggestedMoves.map((m) => m.san)).toEqual(['e4', 'd4']);
    expect(suggestedMoves.length).toBeLessThanOrEqual(2);
    expect(analysis.score).toBe(30); // the engine's, not the built-in guess
  });

  test('"analyzing" shows while the engine thinks, and the page is not blocked meanwhile', async () => {
    let release;
    mockEngineMoves = (game) => new Promise((r) => { release = () => r([suggestion(game, 'e4')]); });
    await mount();

    expect(chess.state.coachAnalyzing).toBe(true);
    expect(chess.state.suggestedMoves).toEqual([]);
    expect(container.textContent).not.toContain('NaN');

    await act(async () => { release(); await sleep(0); });
    expect(chess.state.coachAnalyzing).toBe(false);
    expect(chess.state.suggestedMoves.map((m) => m.san)).toEqual(['e4']);
  });

  test('an answer for a position the board has left is dropped', async () => {
    let release;
    mockEngineMoves = (game) => new Promise((r) => { release = () => r([suggestion(game, 'd4')]); });
    await mount();

    await act(async () => {
      chess.game.move('e4'); // the board moves on while the engine thinks
      release();
      await sleep(0);
    });

    expect(chess.state.suggestedMoves).toEqual([]);
  });

  test('a null answer (replaced by a newer request) changes nothing', async () => {
    mockEngineMoves = async () => null;
    await mount();
    await settle();
    expect(chess.state.suggestedMoves).toEqual([]);
    expect(chess.state.coachAnalyzing).toBe(true); // the newer request will report
  });

  test('none are worked out while the opponent is to move', async () => {
    const calls = jest.fn(async () => []);
    mockEngineMoves = calls;
    await mount();
    calls.mockClear();

    await act(async () => {
      chess.game.move('e4'); // now it is Black's turn, the player is White
      chess.updateAnalysis();
      await sleep(0);
    });

    expect(calls).not.toHaveBeenCalled();
    expect(chess.state.coachAnalyzing).toBe(false);
    expect(chess.state.suggestedMoves).toEqual([]);
  });

  test('without an engine the built-in search answers, two moves, and "analyzing" ends', async () => {
    mockEngineReady = false;
    await mount();
    await settle(400);

    expect(chess.state.coachAnalyzing).toBe(false);
    expect(chess.state.suggestedMoves.length).toBe(2);
  });

  test('an engine that fails to answer falls back to the built-in search', async () => {
    mockEngineMoves = async () => [];
    await mount();
    await settle(400);

    expect(chess.state.coachAnalyzing).toBe(false);
    expect(chess.state.suggestedMoves.length).toBe(2);
  });

  test('still starting: waits for the engine instead of answering with the weaker search', async () => {
    mockEngineReady = false;
    let finish;
    mockPrewarm = () => new Promise((r) => { finish = () => { mockEngineReady = true; r(true); }; });
    await mount();
    await settle(100);
    expect(chess.state.coachAnalyzing).toBe(true); // not answered by the built-in search yet

    await act(async () => { finish(); await sleep(30); });
    expect(chess.state.coachAnalyzing).toBe(false);
    expect(chess.state.suggestedMoves.map((m) => m.san)).toEqual(['e4', 'd4']); // the engine's
  });

  test('an engine that cannot start hands over to the built-in search at once, not after the wait', async () => {
    mockEngineReady = false;
    mockPrewarm = async () => false;
    await mount();
    await settle(400); // far less than the 4 s the engine would be given

    expect(chess.state.suggestedMoves.length).toBe(2);
  });
});

describe('slow engine', () => {
  test('answers with the built-in search after the wait, then the engine replaces that answer once it is up', async () => {
    jest.useFakeTimers('modern');
    mockEngineReady = false;
    let finish;
    mockPrewarm = () => new Promise((r) => { finish = () => { mockEngineReady = true; r(true); }; });

    container = document.createElement('div');
    document.body.appendChild(container);
    const ref = React.createRef();
    await act(async () => { ReactDOM.render(<ChessGame ref={ref} />, container); });
    chess = ref.current;
    expect(chess.state.coachAnalyzing).toBe(true);

    await act(async () => { jest.advanceTimersByTime(4100); }); // the engine is taking too long
    expect(chess.state.coachAnalyzing).toBe(false);
    expect(chess.state.suggestedMoves).toHaveLength(2);
    expect(chess.state.suggestedMoves[0].engineDepth).toBeUndefined(); // the built-in search's

    await act(async () => { finish(); await Promise.resolve(); await Promise.resolve(); });
    expect(chess.state.suggestedMoves.map((m) => m.san)).toEqual(['e4', 'd4']); // the engine's
    expect(chess.state.suggestedMoves[0].engineDepth).toBe(12);
  });
});

describe('clicking squares', () => {
  test('selecting, deselecting and moving a piece never sets state from inside a state updater', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    await mount();
    await act(async () => { chess.setState({ gameMode: 'human' }); }); // no AI reply to wait for

    await act(async () => { chess.onSquareClick('e2'); });
    expect(chess.state.pieceSquare).toBe('e2');
    await act(async () => { chess.onSquareClick('e2'); });
    expect(chess.state.pieceSquare).toBe('');
    await act(async () => { chess.onSquareClick('e2'); });
    await act(async () => { chess.onSquareClick('e4'); });

    expect(chess.game.history()).toEqual(['e4']);
    expect(chess.state.fen).toBe(chess.game.fen());
    expect(chess.state.history.map((m) => m.san)).toEqual(['e4']);
    expect(chess.state.pieceSquare).toBe('');
    const updaterWarnings = err.mock.calls.filter((c) => String(c[0]).includes('update function'));
    expect(updaterWarnings).toEqual([]);
    err.mockRestore();
  });

  test('clicking another piece of your own reselects; an empty square after a failed move deselects', async () => {
    await mount();
    await act(async () => { chess.setState({ gameMode: 'human' }); });

    await act(async () => { chess.onSquareClick('e2'); });
    await act(async () => { chess.onSquareClick('d2'); }); // not a legal move for the e-pawn: picks the d-pawn
    expect(chess.state.pieceSquare).toBe('d2');
    await act(async () => { chess.onSquareClick('e5'); }); // not reachable by it either: nothing selected
    expect(chess.state.pieceSquare).toBe('');
    expect(chess.game.history()).toEqual([]);
  });
});

describe('3D board', () => {
  test('is on by default, can be switched off, and the choice is remembered', async () => {
    await mount();
    expect(chess.state.tiltOn).toBe(true);
    expect(container.querySelector('.tilt-stage.tilted')).not.toBeNull();

    await act(async () => { chess.toggleTilt(); });
    expect(container.querySelector('.tilt-stage.tilted')).toBeNull();
    expect(container.querySelector('.tilt-stage')).not.toBeNull();
    expect(localStorage.getItem('chess_tilt')).toBe('off');

    ReactDOM.unmountComponentAtNode(container);
    await mount();
    expect(chess.state.tiltOn).toBe(false);
  });

  test('tilts 16° on a desktop and 8° on a phone, in the full-screen layout too', async () => {
    window.innerWidth = 1024;
    await mount();
    expect(container.querySelector('.tilt-stage-board').style.transform).toBe('rotateX(16deg)');
    ReactDOM.unmountComponentAtNode(container);

    window.innerWidth = 390; // phones play full screen
    await mount();
    expect(container.querySelector('.chess-fullscreen-mode')).not.toBeNull();
    expect(container.querySelector('.tilt-stage-board').style.transform).toBe('rotateX(8deg)');
  });
});
