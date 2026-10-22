/**
 * The xiangqi coach panel keeps its shape while the coach works: placeholder cards instead of a
 * one-line "analyzing", the win bar and the opponent's explanation stay in place, and the
 * engine's evaluation is not replaced by a built-in guess in between (that swung the bar
 * 62% -> 92% and shook the page, which sits below the board on narrow screens).
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

let mockEngineReady = true;

jest.mock('./services/SoundService', () => ({
  ...jest.requireActual('./services/SoundService'),
  initSound: () => {},
  playSound: () => true,
}));

jest.mock('./services/XiangqiCoachService', () => ({
  initCoachEngine: async () => true,
  isEngineReady: () => mockEngineReady,
  isNetworkActive: () => true,
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
import XiangqiGame from './XiangqiGame';

let container;
let game;

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  const ref = React.createRef();
  await act(async () => { ReactDOM.render(<XiangqiGame ref={ref} />, container); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  game = ref.current;
  await act(async () => { game.setState({ gameMode: 'coach', engineReady: true, engineLoading: false }); });
}

const ENGINE_ANALYSIS = {
  score: 300, evaluation: '红方优势 / Red advantage', winProbability: { red: 0.8, black: 0.2 }, depth: 14, enginePowered: true,
};
const sug = (from, to) => ({
  rank: 1, move: { from, to }, san: `${from}-${to}`, score: 100, winProbability: 0.6, explanation: 'strong', engineDepth: 14,
});

const q = (sel) => container.querySelectorAll(sel);

beforeEach(() => {
  localStorage.clear();
  window.innerWidth = 1024;
  Object.defineProperty(window, 'crossOriginIsolated', { value: true, configurable: true });
  mockEngineReady = true;
});

afterEach(async () => {
  await act(async () => { ReactDOM.unmountComponentAtNode(container); });
  container.remove();
});

describe('while the coach is working', () => {
  test('two placeholder cards stand where the suggestions go, and there is no one-line "analyzing"', async () => {
    await mount();
    await act(async () => { game.setState({ analysis: ENGINE_ANALYSIS, suggestedMoves: [], coachAnalyzing: true }); });

    expect(q('.suggestion.skeleton')).toHaveLength(2);
    expect(q('.coach-analyzing')).toHaveLength(0);
    expect(container.querySelector('.coach-status').textContent).toContain('Analyzing');
  });

  test('the same two cards become the real suggestions, in the same place', async () => {
    await mount();
    await act(async () => { game.setState({ analysis: ENGINE_ANALYSIS, suggestedMoves: [], coachAnalyzing: true }); });
    const before = container.querySelector('.suggested-moves-list');

    await act(async () => {
      game.setState({ suggestedMoves: [sug('a3', 'a4'), sug('b2', 'e2')], coachAnalyzing: false });
    });

    expect(q('.suggestion.skeleton')).toHaveLength(0);
    expect(q('.suggestion')).toHaveLength(2);
    expect(container.querySelector('.suggested-moves-list')).not.toBeNull();
    expect(before).not.toBeNull();
  });

  test('the win bar stays, dimmed, with the last evaluation (not blanked or replaced)', async () => {
    await mount();
    await act(async () => { game.setState({ analysis: ENGINE_ANALYSIS, coachAnalyzing: false }); });
    expect(q('.analysis-section.pending .win-probability')).toHaveLength(0);

    await act(async () => { game.setState({ coachAnalyzing: true }); });
    expect(q('.analysis-section.pending .win-probability')).toHaveLength(1);
    expect(container.querySelector('.prob-red').textContent).toBe('80%');
  });

  test('before any evaluation an empty bar holds the place', async () => {
    await mount();
    await act(async () => { game.setState({ analysis: null, coachAnalyzing: true }); });

    expect(q('.win-probability .prob-bar')).toHaveLength(1);
    expect(container.querySelector('.prob-red').textContent).toBe('');
  });

  test('also while the opponent is moving', async () => {
    await mount();
    await act(async () => { game.setState({ analysis: ENGINE_ANALYSIS, suggestedMoves: [], coachAnalyzing: false, aiThinking: true }); });

    expect(q('.suggestion.skeleton')).toHaveLength(2);
    expect(container.querySelector('.coach-status').textContent).toContain('Opponent');
  });

  test('threats and the opponent\'s explanation stay (dimmed) instead of disappearing and coming back', async () => {
    await mount();
    await act(async () => {
      game.setState({
        analysis: ENGINE_ANALYSIS,
        threatWarning: [{ cn: '你的马受到威胁', en: 'Your Horse is under attack' }],
        lastAIExplanation: '',
        history: [{ san: 'x' }],
        aiThinking: true,
      });
    });

    expect(q('.threat-section.pending')).toHaveLength(1);
    expect(q('.ai-explanation-box')).toHaveLength(1); // the slot is kept, with a placeholder
    expect(container.querySelector('.ai-explanation-box').textContent).toBe('…');

    await act(async () => { game.setState({ aiThinking: false, coachAnalyzing: false, lastAIExplanation: '卒吃兵' }); });
    expect(q('.threat-section.pending')).toHaveLength(0);
    expect(container.querySelector('.ai-explanation-box').textContent).toBe('卒吃兵');
  });
});

describe('the evaluation shown meanwhile', () => {
  test('with the engine ready the previous evaluation is kept: no built-in guess in between', async () => {
    mockEngineReady = true;
    await mount();
    expect(game._provisionalAnalysis()).toEqual({});
  });

  test('without the engine the built-in evaluation is the answer', async () => {
    await mount();
    mockEngineReady = false;
    await act(async () => { game.setState({ engineReady: false }); });
    const patch = game._provisionalAnalysis();
    expect(patch.analysis).toEqual(expect.objectContaining({ winProbability: expect.any(Object) }));
  });
});

describe('the engine does not answer', () => {
  test('the built-in coach also sets its evaluation, so the panel is not left with a stale one', async () => {
    await mount();
    await act(async () => { game.setState({ analysis: ENGINE_ANALYSIS, coachAnalyzing: true }); });

    await act(async () => { game._applyBuiltinCoach(game._positionKey(), 'builtin'); });

    expect(game.state.coachAnalyzing).toBe(false);
    expect(game.state.suggestedMoves.length).toBeGreaterThan(0);
    expect(game.state.suggestedMoves.length).toBeLessThanOrEqual(2);
    expect(game.state.analysis).not.toBe(ENGINE_ANALYSIS);
  });
});
