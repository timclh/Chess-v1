/**
 * ChessCoachService: recommended chess moves from the engine - the right moves in the
 * right shape, White's-view scores, stale answers dropped, repeats not recomputed.
 */
import Chess from 'chess.js';

// chess.js 0.11 only sets `exports.Chess` under Node (webpack's AMD `define` wins in the app)
jest.mock('chess.js', () => jest.requireActual('chess.js').Chess);

const mockInit = jest.fn();
const mockAnalyze = jest.fn();

jest.mock('./FairyStockfishService', () => ({
  __esModule: true,
  default: {
    init: (...args) => mockInit(...args),
    analyze: (...args) => mockAnalyze(...args),
  },
}));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

function load() {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('./ChessCoachService');
}

const lines = (...pairs) => ({
  bestMove: pairs[0][0],
  lines: pairs.map(([uci, score, depth = 12], i) => ({ pv: [uci, 'x'], score, depth, multipv: i + 1 })),
  depth: 12,
  score: pairs[0][1],
});

beforeEach(() => {
  mockInit.mockReset();
  mockAnalyze.mockReset();
  mockInit.mockResolvedValue(true);
});

async function ready() {
  const svc = load();
  await svc.initChessEngine();
  return svc;
}

test('without the engine it answers [] so the caller can use the built-in search', async () => {
  const svc = load();
  expect(await svc.getTopMovesEngineChess(new Chess(START))).toEqual([]);
  expect(mockAnalyze).not.toHaveBeenCalled();
});

test('starts the engine without the xiangqi network', async () => {
  const svc = load();
  expect(await svc.initChessEngine()).toBe(true);
  expect(mockInit).toHaveBeenCalledWith({ network: false });
  expect(svc.isChessEngineReady()).toBe(true);
});

test('a failed start is not retried on every call', async () => {
  mockInit.mockResolvedValue(false);
  const svc = load();
  expect(await svc.initChessEngine()).toBe(false);
  expect(await svc.initChessEngine()).toBe(false);
  expect(mockInit).toHaveBeenCalledTimes(1);
});

test('asks for two lines in the chess variant with an early stop, and returns them as moves', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValue(lines(['e2e4', 30], ['d2d4', 20]));

  const res = await svc.getTopMovesEngineChess(new Chess(START), 2);

  expect(mockAnalyze).toHaveBeenCalledWith(START, 'w', expect.objectContaining({
    variant: 'chess', numLines: 2, timeMs: svc.CHESS_SEARCH.maxMs, earlyStop: svc.CHESS_SEARCH.earlyStop,
  }));
  expect(res.map((r) => [r.rank, r.san])).toEqual([[1, 'e4'], [2, 'd4']]);
  expect(res[0].move).toEqual(expect.objectContaining({ from: 'e2', to: 'e4' }));
  expect(res[0].winProbability).toBeGreaterThan(0.5);
  expect(res[0].winProbability).toBeLessThan(0.99);
  expect(res[0].explanation).toEqual(expect.any(String));
  expect(res[0].engineDepth).toBe(12);
});

test('scores are White\'s view, win chance is the side to move\'s', async () => {
  const svc = await ready();
  // Black to move, and the engine likes e7e5 for Black (+40 for the side to move)
  mockAnalyze.mockResolvedValue(lines(['e7e5', 40], ['c7c5', 25]));

  const res = await svc.getTopMovesEngineChess(new Chess(AFTER_E4), 2);

  expect(res.map((r) => r.san)).toEqual(['e5', 'c5']);
  expect(res[0].score).toBe(-40); // bad for White = good for Black
  expect(res[0].winProbability).toBeGreaterThan(0.5); // Black's chance
});

test('promotions and castling come back as the right legal move', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValueOnce(lines(['a7a8q', 900], ['a7a8n', 300]));
  const promo = await svc.getTopMovesEngineChess(new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'), 2);
  expect(promo.map((r) => r.move.promotion)).toEqual(['q', 'n']);

  mockAnalyze.mockResolvedValueOnce(lines(['e1g1', 20]));
  const castle = await svc.getTopMovesEngineChess(new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), 1);
  expect(castle[0].san).toBe('O-O');
});

test('a move the engine names that is not legal here is skipped', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValue(lines(['e2e5', 30], ['d2d4', 20]));
  const res = await svc.getTopMovesEngineChess(new Chess(START), 2);
  expect(res.map((r) => r.san)).toEqual(['d4']);
});

test('a single legal move needs no analysis', async () => {
  const svc = await ready();
  const forced = new Chess('R6k/8/5K2/8/8/8/8/8 b - - 0 1'); // in check from the rook: Kh7 is the only move
  const legal = forced.moves();
  expect(legal.length).toBe(1);

  const res = await svc.getTopMovesEngineChess(forced, 2);

  expect(mockAnalyze).not.toHaveBeenCalled();
  expect(res).toHaveLength(1);
  expect(res[0].san).toBe(legal[0]);
});

test('a superseded request, or a board that moved on, gives null (drop it)', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValueOnce({ superseded: true, lines: [] });
  expect(await svc.getTopMovesEngineChess(new Chess(START), 2)).toBeNull();

  const game = new Chess(START);
  mockAnalyze.mockImplementationOnce(async () => {
    game.move('e4'); // the board moves while the engine thinks
    return lines(['e2e4', 30], ['d2d4', 20]);
  });
  expect(await svc.getTopMovesEngineChess(game, 2)).toBeNull();
});

test('an engine error is not thrown: [] sends the caller to the built-in search', async () => {
  const svc = await ready();
  const err = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAnalyze.mockRejectedValue(new Error('boom'));
  expect(await svc.getTopMovesEngineChess(new Chess(START), 2)).toEqual([]);
  err.mockRestore();
});

test('the same position is analysed once: a repeat is served from the cache', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValue(lines(['e2e4', 30, 13], ['d2d4', 20, 13]));

  const first = await svc.getTopMovesEngineChess(new Chess(START), 2);
  const second = await svc.getTopMovesEngineChess(new Chess(START), 2);

  expect(mockAnalyze).toHaveBeenCalledTimes(1);
  expect(second).toBe(first);
});

test('a shallow result is not cached', async () => {
  const svc = await ready();
  mockAnalyze.mockResolvedValue(lines(['e2e4', 30, 6], ['d2d4', 20, 6]));
  await svc.getTopMovesEngineChess(new Chess(START), 2);
  await svc.getTopMovesEngineChess(new Chess(START), 2);
  expect(mockAnalyze).toHaveBeenCalledTimes(2);
});

test('asking again while the same position is being analysed joins that search', async () => {
  const svc = await ready();
  let release;
  mockAnalyze.mockImplementation(() => new Promise((r) => { release = () => r(lines(['e2e4', 30], ['d2d4', 20])); }));

  const a = svc.getTopMovesEngineChess(new Chess(START), 2);
  const b = svc.getTopMovesEngineChess(new Chess(START), 2);
  release();

  expect(await a).toBe(await b);
  expect(mockAnalyze).toHaveBeenCalledTimes(1);
});
