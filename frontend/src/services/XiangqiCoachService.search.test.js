/**
 * The xiangqi coach's search: two recommended moves, a search that stops once its answer
 * has settled, a hint that joins a search already running for the same position, and
 * answers for a position that has since changed dropped.
 */
import Xiangqi from '../xiangqi';
import { parseUCIMove as realParse } from './FairyStockfishService';

const mockInit = jest.fn();
const mockAnalyze = jest.fn();

jest.mock('./FairyStockfishService', () => {
  const actual = jest.requireActual('./FairyStockfishService');
  return {
    __esModule: true,
    default: {
      init: (...args) => mockInit(...args),
      analyze: (...args) => mockAnalyze(...args),
      stop: jest.fn(),
      destroy: jest.fn(),
      nnueActive: true,
    },
    parseUCIMove: actual.parseUCIMove,
    toUCIMove: actual.toUCIMove,
  };
});

function load() {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('./XiangqiCoachService');
}

// The engine's answer for the opening position: the central cannon and a horse move
const answer = (depth = 14) => ({
  bestMove: 'h3e3',
  depth,
  score: 40,
  lines: [
    { pv: ['h3e3', 'h8g6'], score: 40, depth, multipv: 1 },
    { pv: ['b1c3', 'h8g6'], score: 30, depth, multipv: 2 },
  ],
});

async function ready() {
  mockInit.mockReset();
  mockAnalyze.mockReset();
  mockInit.mockResolvedValue(true);
  const svc = load();
  await svc.initCoachEngine();
  return svc;
}

test('the coach asks for two lines and stops early; the opponent AI does neither', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValue(answer());

  const res = await svc.getTopMovesEngine(new Xiangqi(), 2);

  expect(mockAnalyze).toHaveBeenCalledWith(expect.any(String), 'r', expect.objectContaining({
    numLines: 2,
    timeMs: svc.COACH_SEARCH.maxMs,
    earlyStop: svc.COACH_SEARCH.earlyStop,
    useNNUE: true,
  }));
  expect(res).toHaveLength(2);
  expect(res[0].rank).toBe(1);

  mockAnalyze.mockClear();
  mockAnalyze.mockResolvedValue(answer(10));
  await svc.getTopMovesEngine(new Xiangqi(), 1, [], { skillLevel: 3 });
  expect(mockAnalyze).toHaveBeenCalledWith(expect.any(String), 'r', expect.objectContaining({
    numLines: 1, earlyStop: null, useNNUE: false,
  }));
});

test('the coach budget is a fraction of the 6 s it used to take', () => {
  const { COACH_SEARCH } = load();
  expect(COACH_SEARCH.maxMs).toBeLessThanOrEqual(3000);
  expect(COACH_SEARCH.earlyStop.minMs).toBeLessThan(1000);
});

test('a hint asked for while the same position is analysed joins that search', async () => {
  const svc = await ready();
  let release;
  mockAnalyze.mockImplementation(() => new Promise((r) => { release = () => r(answer()); }));

  const prefetch = svc.getTopMovesEngine(new Xiangqi(), 2);
  const hint = svc.getTopMovesEngine(new Xiangqi(), 2);
  release();

  expect(await hint).toBe(await prefetch);
  expect(mockAnalyze).toHaveBeenCalledTimes(1);
});

test('a settled result is cached, so the next hint for the position is instant', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValue(answer(13));

  await svc.getTopMovesEngine(new Xiangqi(), 2);
  await svc.getTopMovesEngine(new Xiangqi(), 2);

  expect(mockAnalyze).toHaveBeenCalledTimes(1);
});

test('an answer for a position the board has since left is dropped', async () => {
  const svc = await ready();
  const game = new Xiangqi();
  mockAnalyze.mockImplementationOnce(async () => {
    game.move(game.moves({ verbose: true })[0]); // the board moves on while the engine thinks
    return answer();
  });

  expect(await svc.getTopMovesEngine(game, 2)).toBeNull();

  // and it was not cached under the old position
  mockAnalyze.mockResolvedValue(answer());
  const fresh = await svc.getTopMovesEngine(new Xiangqi(), 2);
  expect(fresh).toHaveLength(2);
});

test('parseUCIMove still maps engine ranks to ours', () => {
  expect(realParse('h3e3')).toEqual({ from: 'h2', to: 'e2' });
});
