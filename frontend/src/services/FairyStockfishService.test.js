/**
 * Regression tests for the UCI request/reply bookkeeping in FairyStockfishService.
 *
 * UCI answers every `go` - including one cut short by `stop` - with its own
 * `bestmove`. The service used to treat the late `bestmove` of a stopped search
 * as the result of the *next* search, so a coach request issued while another
 * analysis was running came back shallow, empty or for the wrong position and
 * the game silently fell back to the much weaker built-in AI.
 *
 * The fake engine below behaves like the real one: commands are processed
 * asynchronously and in order, and `stop` is answered by a late `bestmove`
 * preceded by a trailing `info` line.
 */
import service, { toFairySF_FEN } from './FairyStockfishService';

const FENS = {
  A: 'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR',
  B: 'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/4C2C1/9/RHEAKAEHR',
  C: 'rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C2C4/9/RHEAKAEHR',
};
const FULL_DEPTH = 12;
const SEARCH_MS = 150;

// The fake engine tags its principal variation with a hash of the FEN it was
// given, so a test can tell which position a result belongs to.
const tagOf = (fairyFen) => 'p' + [...fairyFen].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);
const tagFor = (key) => tagOf(toFairySF_FEN(FENS[key], 'r'));

function makeFakeEngine() {
  let listener = null;
  let fen = null;
  let searching = false;
  let timer = null;
  let searchTag = null;
  const emit = (line, delay) => setTimeout(() => listener && listener(line), delay);
  const infos = (tag, depth) => [1, 2, 3].map((i) => `info depth ${depth} multipv ${i} score cp ${10 * i} pv ${tag}`);

  const handle = (cmd) => {
    if (cmd.startsWith('position fen ')) {
      fen = cmd.slice('position fen '.length);
    } else if (cmd.startsWith('go ')) {
      const movetime = Number(cmd.match(/movetime (\d+)/)[1]);
      searching = true;
      searchTag = tagOf(fen);
      const myTag = searchTag;
      infos(myTag, 5).forEach((l) => emit(l, 5));
      timer = setTimeout(() => {
        searching = false;
        infos(myTag, FULL_DEPTH).forEach((l) => emit(l, 0));
        emit(`bestmove ${myTag}`, 1);
      }, movetime);
    } else if (cmd === 'stop') {
      if (!searching) return; // UCI: `stop` while idle produces no bestmove
      clearTimeout(timer);
      searching = false;
      infos(searchTag, 7).forEach((l) => emit(l, 3)); // trailing info of the stopped search
      emit(`bestmove ${searchTag}`, 8); // late reply
    }
  };

  return {
    postMessage: (cmd) => setTimeout(() => handle(cmd), 1),
    addMessageListener: (cb) => { listener = cb; },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const depthOf = (res) => Math.max(0, ...res.lines.filter(Boolean).map((l) => l.depth));
const tagsOf = (res) => [...new Set(res.lines.filter(Boolean).map((l) => l.pv[0]))];

// Start the requests at the given offsets (ms); resolve with { key: { result, ms } }
async function run(plan) {
  const out = {};
  const t0 = Date.now();
  await Promise.all(plan.map(async ({ at, key }) => {
    await sleep(at);
    const started = Date.now();
    const result = await service.analyze(FENS[key], 'r', { depth: 20, timeMs: SEARCH_MS, numLines: 3 });
    out[key] = { result, ms: Date.now() - started, finishedAt: Date.now() - t0 };
  }));
  await sleep(100); // let stray engine output land
  return out;
}

beforeEach(() => {
  service.engine = makeFakeEngine();
  service.engine.addMessageListener((line) => service._onMessage(line));
  service.ready = true;
  service._searching = false;
  service._idleWaiters = [];
  service._analysisChain = Promise.resolve();
  service._currentAnalysis = null;
  service._multiPVLines = [];
});

test('a lone request returns the full-depth result for its own position', async () => {
  const { A } = await run([{ at: 0, key: 'A' }]);
  expect(depthOf(A.result)).toBe(FULL_DEPTH);
  expect(tagsOf(A.result)).toEqual([tagFor('A')]);
});

test('a request issued while another search is running still gets a full-depth result for its own position', async () => {
  const { A, B } = await run([{ at: 0, key: 'A' }, { at: 40, key: 'B' }]);

  // B used to be "answered" by A's late bestmove with whatever lines existed
  // at that moment (depth 5 here, usually nothing at all on the real engine).
  expect(depthOf(B.result)).toBe(FULL_DEPTH);
  expect(tagsOf(B.result)).toEqual([tagFor('B')]);

  // The replaced request settles promptly (it used to hang for timeMs + 10s)
  // and reports its own position, not B's.
  expect(A.ms).toBeLessThan(1000);
  expect(tagsOf(A.result)).toEqual([tagFor('A')]);
});

test('the latest request of a burst wins; a request replaced before it started is reported as superseded', async () => {
  const { B, C } = await run([{ at: 0, key: 'A' }, { at: 40, key: 'B' }, { at: 40, key: 'C' }]);

  expect(B.result.superseded).toBe(true);
  expect(B.result.lines).toEqual([]);

  expect(C.result.superseded).toBeUndefined();
  expect(depthOf(C.result)).toBe(FULL_DEPTH);
  expect(tagsOf(C.result)).toEqual([tagFor('C')]);
});

test('requests issued one after another each get their own position', async () => {
  const first = await run([{ at: 0, key: 'A' }]);
  const second = await run([{ at: 0, key: 'B' }]);
  expect(tagsOf(first.A.result)).toEqual([tagFor('A')]);
  expect(tagsOf(second.B.result)).toEqual([tagFor('B')]);
  expect(depthOf(second.B.result)).toBe(FULL_DEPTH);
});
