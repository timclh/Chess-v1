/**
 * FairyStockfishService + the xiangqi network: loading it, falling back when it
 * is missing or refused, switching it off for the opponent AI, and keeping its
 * centipawn scores on the classical scale.
 *
 * The fake engine mimics the parts of Fairy-Stockfish that matter here: it only
 * accepts a network whose file name starts with the variant name, and it reports
 * which evaluation is active with an `info string`.
 */
import service, { NNUE_SCORE_DIVISOR } from './FairyStockfishService';
import { fetchNetwork, XIANGQI_NET } from './XiangqiNetwork';

jest.mock('./XiangqiNetwork', () => ({
  XIANGQI_NET: { file: 'xiangqi-test123.nnue', bytes: 3, sha256: 'x' },
  fetchNetwork: jest.fn(),
}));

const FEN = 'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR';
const RAW_CP = 150;

function makeEngine({ accept = true } = {}) {
  const sent = [];
  const written = {};
  let listener = null;
  const emit = (line) => setTimeout(() => listener && listener(line), 0);
  let useNNUE = true;
  let evalFile = null;
  const engine = {
    sent,
    written,
    FS: { writeFile: (p, data) => { written[p] = data; } },
    addMessageListener: (cb) => { listener = cb; },
    postMessage: (cmd) => {
      sent.push(cmd);
      if (cmd.startsWith('setoption name EvalFile value ')) {
        evalFile = cmd.slice('setoption name EvalFile value '.length);
        const base = evalFile.slice(evalFile.lastIndexOf('/') + 1);
        if (accept && base.startsWith('xiangqi') && written[evalFile]) emit(`info string NNUE evaluation using ${evalFile} enabled`);
        else emit('info string classical evaluation enabled');
      } else if (cmd.startsWith('setoption name Use NNUE value ')) {
        useNNUE = cmd.endsWith('true');
      } else if (cmd === 'isready') {
        emit('readyok');
      } else if (cmd.startsWith('go ')) {
        // The "network" scores everything 1.5x higher than classical, like the real one
        const cp = useNNUE && evalFile && accept ? Math.round(RAW_CP * NNUE_SCORE_DIVISOR) : RAW_CP;
        emit(`info depth 10 multipv 1 score cp ${cp} pv h3e3 h10g8`);
        emit('bestmove h3e3');
      }
    },
  };
  return engine;
}

function attach(engine) {
  service.engine = engine;
  service.engine.addMessageListener((line) => service._onMessage(line));
  service.ready = true;
  service.nnueActive = false;
  service._nnueOn = true;
  service._scoreDivisor = 1;
  service._evalMode = null;
  service._searching = false;
  service._idleWaiters = [];
  service._analysisChain = Promise.resolve();
  service._currentAnalysis = null;
  service._multiPVLines = [];
}

const goodBytes = new Uint8Array([1, 2, 3]);
const noLog = () => jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('loading the network', () => {
  test('writes it under a name that starts with the variant, points EvalFile at it and reports success', async () => {
    const engine = makeEngine();
    attach(engine);
    fetchNetwork.mockResolvedValue(goodBytes);

    expect(await service._loadNetwork()).toBe(true);

    expect(Object.keys(engine.written)).toEqual([`/${XIANGQI_NET.file}`]);
    expect(engine.written[`/${XIANGQI_NET.file}`]).toBe(goodBytes);
    expect(engine.sent).toContain(`setoption name EvalFile value /${XIANGQI_NET.file}`);
    expect(engine.sent).not.toContain('setoption name Use NNUE value false');
  });

  test('without the network file the engine is left alone (no EvalFile, which would make it exit)', async () => {
    const engine = makeEngine();
    attach(engine);
    fetchNetwork.mockResolvedValue(null);
    const warn = noLog();

    expect(await service._loadNetwork()).toBe(false);

    expect(engine.sent.some((c) => c.includes('EvalFile'))).toBe(false);
    expect(engine.sent).toContain('setoption name Use NNUE value false');
    warn.mockRestore();
  });

  test('if the engine refuses the network it falls back to classical evaluation', async () => {
    const engine = makeEngine({ accept: false });
    attach(engine);
    fetchNetwork.mockResolvedValue(goodBytes);
    const warn = noLog();

    expect(await service._loadNetwork()).toBe(false);

    expect(engine.sent).toContain('setoption name Use NNUE value false');
    warn.mockRestore();
  });

  test('a build without a writable file system is tolerated', async () => {
    const engine = makeEngine();
    delete engine.FS;
    attach(engine);
    fetchNetwork.mockResolvedValue(goodBytes);
    const warn = noLog();

    expect(await service._loadNetwork()).toBe(false);
    warn.mockRestore();
  });
});

describe('searching with the network', () => {
  async function ready() {
    const engine = makeEngine();
    attach(engine);
    fetchNetwork.mockResolvedValue(goodBytes);
    service.nnueActive = await service._loadNetwork();
    engine.sent.length = 0;
    return engine;
  }

  test('hints use the network and its scores are brought back to the classical scale', async () => {
    const engine = await ready();
    const res = await service.analyze(FEN, 'r', { timeMs: 50, numLines: 1 });
    expect(res.score).toBe(RAW_CP); // 225 from the engine / 1.5
    expect(engine.sent.some((c) => c.startsWith('setoption name Use NNUE'))).toBe(false); // already on
  });

  test('the opponent AI searches without it, and the network comes back for the next hint', async () => {
    const engine = await ready();

    const opponent = await service.analyze(FEN, 'r', { timeMs: 50, numLines: 1, skillLevel: 3, useNNUE: false });
    expect(engine.sent).toContain('setoption name Use NNUE value false');
    expect(opponent.score).toBe(RAW_CP); // classical score, not divided

    engine.sent.length = 0;
    const hint = await service.analyze(FEN, 'r', { timeMs: 50, numLines: 1 });
    expect(engine.sent).toContain('setoption name Use NNUE value true');
    expect(hint.score).toBe(RAW_CP);
  });

  test('without a loaded network nothing is switched and nothing is rescaled', async () => {
    const engine = makeEngine({ accept: false });
    attach(engine);
    service.nnueActive = false;

    const res = await service.analyze(FEN, 'r', { timeMs: 50, numLines: 1, useNNUE: false });

    expect(engine.sent.some((c) => c.startsWith('setoption name Use NNUE'))).toBe(false);
    expect(res.score).toBe(RAW_CP);
  });
});
