/**
 * Wiring test: XiangqiGame plays the right sound for player moves, AI moves,
 * captures, checks and game over, and exposes the mute toggle.
 *
 * Sound playback itself is covered by services/SoundService.test.js; here
 * playSound is replaced by a recorder and the engine / AI search are stubbed.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

const mockPlayed = [];
let mockAIMove = null;

jest.mock('./services/SoundService', () => {
  const actual = jest.requireActual('./services/SoundService');
  return {
    ...actual,
    initSound: () => {},
    playSound: (name) => { mockPlayed.push(name); return true; },
  };
});

// The engine "loads" but is never ready, so moves go through the stubbed built-in AI
jest.mock('./services/XiangqiCoachService', () => ({
  initCoachEngine: async () => true,
  isEngineReady: () => false,
  getTopMovesEngine: async () => null,
  analyzePositionEngine: async () => null,
  stopAnalysis: () => {},
  destroyEngine: () => {},
  clearAnalysisCache: () => {},
}));

jest.mock('./XiangqiAI', () => ({
  ...jest.requireActual('./XiangqiAI'),
  findBestMove: () => mockAIMove,
}));

// eslint-disable-next-line import/first
import XiangqiGame from './XiangqiGame';

const MATE_IN_ONE = '4k4/R8/9/9/9/9/9/9/8R/3K5'; // Red: i1-i9 is checkmate
const CHECK_IN_ONE = '4k4/9/9/9/9/9/9/9/9/R4K3'; // Red: a0-a9 gives check

let container;
let game; // XiangqiGame instance

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  const ref = React.createRef();
  await act(async () => {
    ReactDOM.render(<XiangqiGame ref={ref} />, container);
  });
  await flush();
  game = ref.current;
}

function loadPosition(fen, turn = 'r') {
  game.game.loadFEN(fen);
  game.game.turn = turn;
}

describe('XiangqiGame sound wiring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    mockPlayed.length = 0;
    mockAIMove = null;
    Object.defineProperty(window, 'crossOriginIsolated', { value: true, configurable: true });
    window.innerWidth = 1024;
  });

  afterEach(async () => {
    if (container) {
      await act(async () => {
        ReactDOM.unmountComponentAtNode(container);
      });
      container.remove();
      container = null;
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('plain player move -> move', async () => {
    await mount();
    act(() => game.handleMove({ from: 'a3', to: 'a4' }));
    expect(mockPlayed).toEqual(['move']);
  });

  test('capture -> capture', async () => {
    await mount();
    act(() => game.handleMove({ from: 'b2', to: 'b9' })); // cannon takes the far horse
    expect(mockPlayed).toEqual(['capture']);
  });

  test('check -> check', async () => {
    await mount();
    loadPosition(CHECK_IN_ONE);
    act(() => game.handleMove({ from: 'a0', to: 'a9' }));
    await flush();
    expect(mockPlayed).toEqual(['check']);
  });

  test('player delivers checkmate -> win', async () => {
    await mount();
    loadPosition(MATE_IN_ONE);
    act(() => game.handleMove({ from: 'i1', to: 'i9' }));
    await flush();
    expect(mockPlayed).toEqual(['win']);
  });

  test('AI move: capture -> capture, checkmate -> lose', async () => {
    await mount();
    act(() => game.setState({ playerColor: 'b' }));

    mockAIMove = { from: 'b2', to: 'b9' };
    await act(async () => { await game.makeAIMove(); });
    expect(mockPlayed).toEqual(['capture']);

    mockPlayed.length = 0;
    loadPosition(MATE_IN_ONE);
    mockAIMove = { from: 'i1', to: 'i9' };
    await act(async () => { await game.makeAIMove(); });
    await flush();
    expect(mockPlayed).toEqual(['lose']);
  });

  test('tutorial: only the correct move makes a sound', async () => {
    await mount();
    act(() => game.startTutorial(0)); // lesson 1: a0-a9 is the answer
    act(() => game.handleMove({ from: 'a0', to: 'a5' })); // legal but wrong -> undone
    expect(mockPlayed).toEqual([]);
    act(() => game.handleMove({ from: 'a0', to: 'a9' }));
    expect(mockPlayed).toEqual(['check']);
  });

  test('desktop settings panel has a sound toggle that persists', async () => {
    await mount();
    expect(container.textContent).toContain('声音 / Sound');
    expect(game.state.soundMuted).toBe(false);

    act(() => game.toggleSound());
    expect(game.state.soundMuted).toBe(true);
    expect(localStorage.getItem('qi_arena_sound_muted')).toBe('1');
    expect(mockPlayed).toEqual([]); // muting is silent

    act(() => game.toggleSound());
    expect(game.state.soundMuted).toBe(false);
    expect(mockPlayed).toEqual(['move']); // unmute plays a confirmation click
  });

  test('fullscreen top bar has a mute button', async () => {
    window.innerWidth = 500; // phone layout
    await mount();
    const btn = container.querySelector('.fs-top-bar button[aria-label="Mute sound"]');
    expect(btn).not.toBeNull();
    expect(btn.querySelector('svg').getAttribute('class')).toMatch(/volume-2/); // speaker icon

    act(() => { btn.click(); });
    const after = container.querySelector('.fs-top-bar button[aria-label="Unmute sound"]');
    expect(after).not.toBeNull();
    expect(after.querySelector('svg').getAttribute('class')).toMatch(/volume-x/); // muted icon
  });
});
