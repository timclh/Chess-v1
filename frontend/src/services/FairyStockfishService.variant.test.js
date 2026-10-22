/**
 * FairyStockfishService: playing standard chess next to xiangqi, loading the xiangqi
 * network only when it is wanted, and stopping a search early once its answer settles.
 *
 * The fake engine behaves like the real one where it matters: commands are handled
 * in order and asynchronously, it answers `isready`, reports one `info` line per
 * MultiPV line and depth, and answers `stop` (or the end of its time) with `bestmove`.
 */
import service from './FairyStockfishService';
import { fetchNetwork } from './XiangqiNetwork';

jest.mock('./XiangqiNetwork', () => ({
  XIANGQI_NET: { file: 'xiangqi-test123.nnue', bytes: 3, sha256: 'x' },
  fetchNetwork: jest.fn(),
}));

const XIANGQI_FEN = 'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR';
const CHESS_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const STEP_MS = 12; // one depth every 12 ms

/** `bestAt(depth, line)` is the first move of that line at that depth. */
function makeEngine({ bestAt, boundFrom = null } = {}) {
  const sent = [];
  let listener = null;
  let multipv = 1;
  let timer = null;
  let searching = false;
  let evalFile = null;
  const emit = (line) => setTimeout(() => listener && listener(line), 0);
  const written = {};

  const finish = () => {
    searching = false;
    clearInterval(timer);
    emit('bestmove ' + bestAt(99, 1));
  };

  return {
    sent,
    FS: { writeFile: (p, data) => { written[p] = data; } },
    addMessageListener: (cb) => { listener = cb; },
    postMessage: (cmd) => {
      sent.push(cmd);
      setTimeout(() => {
        if (cmd === 'isready') emit('readyok');
        else if (cmd.startsWith('setoption name MultiPV value ')) multipv = Number(cmd.split(' ').pop());
        else if (cmd.startsWith('setoption name EvalFile value ')) evalFile = cmd.split(' ').pop();
        else if (cmd.startsWith('go ')) {
          searching = true;
          if (evalFile) emit('info string NNUE evaluation using ' + evalFile + ' enabled');
          const budget = Number((cmd.match(/movetime (\d+)/) || [0, 50])[1]);
          const started = Date.now();
          let depth = 5;
          timer = setInterval(() => {
            depth += 1;
            for (let i = 1; i <= multipv; i += 1) {
              emit(`info depth ${depth} multipv ${i} score cp ${40 - i * 10} pv ${bestAt(depth, i)}`);
              // a re-search still narrowing the score, printed after the exact line
              if (boundFrom !== null && depth >= boundFrom && i === 1) emit(`info depth ${depth} multipv 1 score cp 900 lowerbound pv zzzz`);
            }
            if (Date.now() - started >= budget) finish();
          }, STEP_MS);
        } else if (cmd === 'stop' && searching) {
          finish();
        }
      }, 0);
    },
  };
}

function attach(engine) {
  service.engine = engine;
  service.engine.addMessageListener((line) => service._onMessage(line));
  service.ready = true;
  service.nnueActive = false;
  service._nnueOn = true;
  service._scoreDivisor = 1;
  service._evalMode = null;
  service._variant = 'xiangqi';
  service._networkPromise = null;
  service._networkLoading = null;
  service._early = null;
  service._searching = false;
  service._idleWaiters = [];
  service._analysisChain = Promise.resolve();
  service._currentAnalysis = null;
  service._multiPVLines = [];
}

const steady = (depth, line) => (depth < 10 ? 'a1a2' : line === 1 ? 'b1b2' : 'c1c2');
const restless = (depth, line) => (depth % 2 ? `a${line}a${line + 1}` : `b${line}b${line + 1}`);
const setOptions = (engine) => engine.sent.filter((c) => c.startsWith('setoption name UCI_Variant'));

describe('chess next to xiangqi', () => {
  test('switches the variant once, clears the hash table, and passes a standard FEN through untouched', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);

    await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 40, numLines: 2 });

    expect(setOptions(engine)).toEqual(['setoption name UCI_Variant value chess']);
    const variantAt = engine.sent.indexOf('setoption name UCI_Variant value chess');
    expect(engine.sent[variantAt + 1]).toBe('ucinewgame');
    expect(engine.sent).toContain(`position fen ${CHESS_FEN}`);

    engine.sent.length = 0;
    await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 40, numLines: 2 });
    expect(setOptions(engine)).toEqual([]); // already chess: nothing to switch
  });

  test('going back to xiangqi switches again, and its FEN is translated as before', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);

    await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 40, numLines: 1 });
    engine.sent.length = 0;
    await service.analyze(XIANGQI_FEN, 'r', { timeMs: 40, numLines: 1 });

    expect(setOptions(engine)).toEqual(['setoption name UCI_Variant value xiangqi']);
    expect(engine.sent).toContain('ucinewgame');
    expect(engine.sent.some((c) => c.startsWith('position fen ') && c.includes('rnbakabnr'))).toBe(true);
  });

  test('chess is searched with the classical evaluation and its scores are not rescaled', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);
    service.nnueActive = true; // a xiangqi network is loaded

    const res = await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 40, numLines: 1 });

    expect(engine.sent.some((c) => c.startsWith('setoption name Use NNUE'))).toBe(false);
    expect(res.score).toBe(30); // exactly what the engine said (no ÷ 1.5)
  });
});

describe('loading the xiangqi network only when wanted', () => {
  test('init without the network skips the download; a later init loads it once', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);
    fetchNetwork.mockReset();
    fetchNetwork.mockResolvedValue(new Uint8Array([1, 2, 3]));

    expect(await service.init({ network: false })).toBe(true);
    expect(fetchNetwork).not.toHaveBeenCalled();
    expect(service.nnueActive).toBe(false);

    expect(await service.init()).toBe(true);
    expect(await service.init()).toBe(true);
    expect(fetchNetwork).toHaveBeenCalledTimes(1);
    expect(service.nnueActive).toBe(true);
  });

  test('the network is loaded as xiangqi even if the engine was last playing chess', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);
    fetchNetwork.mockReset();
    fetchNetwork.mockResolvedValue(new Uint8Array([1, 2, 3]));

    await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 30, numLines: 1 });
    engine.sent.length = 0;
    await service.init();

    const sent = engine.sent;
    expect(sent.indexOf('setoption name UCI_Variant value xiangqi')).toBeGreaterThanOrEqual(0);
    expect(sent.indexOf('setoption name UCI_Variant value xiangqi')).toBeLessThan(
      sent.findIndex((c) => c.startsWith('setoption name EvalFile'))
    );
  });
});

describe('stopping early', () => {
  const early = { minMs: 0, minDepth: 12, stableDepths: 3 };
  // analyze() always sends a `stop` first (to replace a running search); this is about the one after `go`
  const stoppedAfterGo = (engine) => engine.sent.slice(engine.sent.findIndex((c) => c.startsWith('go '))).includes('stop');

  test('stops once the best move has stayed the same for the last few depths', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);

    const started = Date.now();
    const res = await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 3000, numLines: 2, earlyStop: early });

    expect(Date.now() - started).toBeLessThan(1000); // not the 3 s it was allowed
    expect(stoppedAfterGo(engine)).toBe(true);
    expect(res.lines.map((l) => l.pv[0])).toEqual(['b1b2', 'c1c2']);
    expect(res.lines.every((l) => l.depth === res.lines[0].depth)).toBe(true); // a whole iteration, not a torn one
  });

  test('keeps thinking while the best move keeps changing', async () => {
    const engine = makeEngine({ bestAt: restless });
    attach(engine);

    const started = Date.now();
    await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 300, numLines: 1, earlyStop: early });

    expect(Date.now() - started).toBeGreaterThanOrEqual(280);
    expect(stoppedAfterGo(engine)).toBe(false);
  });

  test('never before the minimum time or depth', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);

    const started = Date.now();
    await service.analyze(CHESS_FEN, 'w', {
      variant: 'chess', timeMs: 3000, numLines: 1, earlyStop: { minMs: 250, minDepth: 8, stableDepths: 3 },
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(240);

    const deep = makeEngine({ bestAt: steady });
    attach(deep);
    const res = await service.analyze(CHESS_FEN, 'w', {
      variant: 'chess', timeMs: 3000, numLines: 1, earlyStop: { minMs: 0, minDepth: 20, stableDepths: 3 },
    });
    expect(res.lines[0].depth).toBeGreaterThanOrEqual(20);
  });

  test('without earlyStop a search runs for its whole time', async () => {
    const engine = makeEngine({ bestAt: steady });
    attach(engine);

    const started = Date.now();
    await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 200, numLines: 1 });

    expect(Date.now() - started).toBeGreaterThanOrEqual(190);
    expect(stoppedAfterGo(engine)).toBe(false);
  });

  test('a line that is still being narrowed (lowerbound) is not taken as a result', async () => {
    const engine = makeEngine({ bestAt: steady, boundFrom: 12 });
    attach(engine);

    const res = await service.analyze(CHESS_FEN, 'w', { variant: 'chess', timeMs: 200, numLines: 1 });

    expect(res.lines[0].pv[0]).toBe('b1b2');
    expect(res.lines[0].score).not.toBe(900);
  });
});
