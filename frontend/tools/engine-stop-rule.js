// How soon can the coach stop thinking? Replays a recorded search against early-stop rules and
// compares the move it would have given with the move after a long (8 s) search.
//   node --no-experimental-fetch tools/engine-stop-rule.js <pkgDir> <netFile|-> <xiangqi|chess> <seed> <positions> <outFile>
// <pkgDir> is node_modules/fairy-stockfish-nnue.wasm; <netFile> the xiangqi network (use - for chess).
const fs = require('fs'); const path = require('path');
const [pkgDir, netFile, variant, seedArg, countArg, outFile] = process.argv.slice(2);
let seed = parseInt(seedArg || '1', 10); const COUNT = parseInt(countArg || '12', 10);
const START = variant === 'chess' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
const MAXMS = variant === 'chess' ? 1500 : 2500; const REF = 8000;
const Stockfish = require(path.resolve(pkgDir, 'stockfish.js'));
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const out = (s) => { console.log(s); if (outFile) fs.appendFileSync(outFile, s + '\n'); };
(async () => {
  const sf = await Stockfish(); let cur = null;
  sf.addMessageListener((l) => { if (cur) cur(l); });
  const send = (c) => sf.postMessage(c);
  const wait = (re, ms = 60000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + re)), ms); cur = (l) => { if (re.test(l)) { clearTimeout(t); cur = null; res(l); } }; });
  send('uci'); await wait(/uciok/); send('setoption name Threads value 1'); send('setoption name Hash value 32');
  send(`setoption name UCI_Variant value ${variant}`);
  if (variant === 'xiangqi' && netFile !== '-') { sf.FS.writeFile('/xiangqi-net.nnue', fs.readFileSync(netFile)); send('setoption name EvalFile value /xiangqi-net.nnue'); }
  send('isready'); await wait(/readyok/);
  const pos = (m) => `position fen ${START}${m.length ? ' moves ' + m.join(' ') : ''}`;
  const search = async (moves, mt, mpv) => {
    send(`setoption name MultiPV value ${mpv}`); send(pos(moves));
    const iters = []; let cur_ = {}; const t0 = Date.now();
    const p = new Promise((res) => { cur = (l) => {
      const m = l.match(/^info depth (\d+) .*?multipv (\d+) score (cp|mate) (-?\d+).*? pv (\S+)/);
      if (m && !/bound/.test(l)) { cur_[+m[2]] = m[5]; if (+m[2] === mpv) { iters.push({ ms: Date.now() - t0, depth: +m[1], moves: Array.from({ length: mpv }, (_, i) => cur_[i + 1]) }); cur_ = {}; } }
      if (/^bestmove/.test(l)) res(l.split(/\s+/)[1]); }; });
    send(`go movetime ${mt}`); const best = await p; return { best, iters };
  };
  const legal = async (moves) => { send(pos(moves)); const list = []; const p = new Promise((res) => { cur = (l) => { const m = l.match(/^([a-i]\d+[a-i]\d+|[a-h][1-8][a-h][1-8][qrbn]?): \d+/); if (m) list.push(m[1]); if (/^Nodes searched/.test(l)) res(); }; }); send('go perft 1'); await p; return list; };
  const rules = {
    'top1  K=3': { sig: (m) => m[0], K: 3 },
    'top1  K=2': { sig: (m) => m[0], K: 2 },
    'pair  K=3': { sig: (m) => [...m].sort().join(), K: 3 },
    'pair  K=2': { sig: (m) => [...m].sort().join(), K: 2 },
  };
  const minMs = variant === 'chess' ? 400 : 600; const minDepth = variant === 'chess' ? 10 : 12;
  const stats = {}; for (const k of Object.keys(rules)) stats[k] = { ms: 0, agree: 0, in2: 0, capped: 0, n: 0 };
  let n = 0;
  while (n < COUNT) {
    const target = 10 + Math.floor(rnd() * 50); const moves = [];
    for (let i = 0; i < 2; i += 1) { const l = await legal(moves); moves.push(l[Math.floor(rnd() * l.length)]); }
    let dead = false;
    while (moves.length < target) { const r = await search(moves, 50, 1); if (!r.best || r.best === '(none)') { dead = true; break; } moves.push(r.best); }
    if (dead) continue;
    const ref = await search(moves, REF, 2); if (!ref.best || ref.best === '(none)') continue;
    const run = await search(moves, MAXMS, 2); if (!run.iters.length) continue;
    n += 1;
    for (const [name, rule] of Object.entries(rules)) {
      let stop = null; const hist = [];
      for (const it of run.iters) {
        hist.push(rule.sig(it.moves));
        if (it.ms >= minMs && it.depth >= minDepth && hist.length >= rule.K && hist.slice(-rule.K).every((x) => x === hist[hist.length - 1])) { stop = it; break; }
      }
      const at = stop || run.iters[run.iters.length - 1];
      const st = stats[name]; st.n += 1; st.ms += stop ? stop.ms : MAXMS; if (!stop) st.capped += 1;
      if (at.moves[0] === ref.best) st.agree += 1; if (at.moves.includes(ref.best)) st.in2 += 1;
    }
  }
  out(`# ${variant} ${n} positions, minMs ${minMs} minDepth ${minDepth} cap ${MAXMS}`);
  for (const [k, s] of Object.entries(stats)) out(`${k}: avg ${(s.ms / s.n).toFixed(0)} ms, hit cap ${s.capped}/${s.n}, top1==ref(${REF}ms) ${(100 * s.agree / s.n).toFixed(0)}%, ref in top2 ${(100 * s.in2 / s.n).toFixed(0)}%`);
  process.exit(0);
})().catch((e) => { console.error('failed', e); process.exit(1); });
