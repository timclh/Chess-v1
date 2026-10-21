const fs = require('fs');
const path = require('path');

/**
 * Engine-vs-engine match for the xiangqi coach engine: the shipped Fairy-Stockfish
 * WASM with the NNUE network ("NNUE") against the same engine on its classical
 * evaluation ("classical"). Use it to check an engine or network upgrade before
 * shipping it (2026-10: 48-0 for the network at 0.3 s/move).
 *
 *   node --no-experimental-fetch tools/engine-match.js [games] [movetimeMs] [seed] [resultsFile]
 *   OPEN_PLIES=2   random opening plies per game pair (default 2)
 *
 * Needs Node 22 with --no-experimental-fetch (Emscripten loads the .wasm from disk),
 * node_modules installed, and public/xiangqi-*.nnue. Games alternate colours from
 * the same random opening; the loser is the side that has no legal move, or whose
 * own score is -10 pawns or worse for 3 moves in a row; repeated 4-ply cycles and
 * 220 plies are draws. Run several processes in parallel for more games.
 *
 * The network is written into the engine under a name starting with "xiangqi":
 * Fairy-Stockfish silently ignores a network whose file name does not start with the
 * variant name, and this script checks the engine really reports using it.
 */
const root = path.resolve(__dirname, "..");
const pkgDir = path.join(root, "node_modules", "fairy-stockfish-nnue.wasm");
const netFile = fs.readdirSync(path.join(root, "public")).filter((f) => /^xiangqi-.*\.nnue$/.test(f)).map((f) => path.join(root, "public", f))[0];
const [gamesArg, mtArg, seedArg, outFile] = process.argv.slice(2);
const GAMES = parseInt(gamesArg || '8', 10);
const MOVETIME = parseInt(mtArg || '300', 10);
let seed = parseInt(seedArg || '1', 10);
const MAX_PLIES = 220;
const START = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

const Stockfish = require(path.resolve(pkgDir, 'stockfish.js'));
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const out = (s) => { console.log(s); if (outFile) fs.appendFileSync(outFile, s + '\n'); };

async function makeEngine(name, nnue) {
  const sf = await Stockfish();
  const e = { name, sf, cur: null, strings: [], nodes: 0, searches: 0, depthSum: 0, npsSum: 0 };
  sf.addMessageListener((l) => {
    if (/^info string/.test(l)) e.strings.push(l);
    if (e.cur) e.cur(l);
  });
  e.send = (c) => sf.postMessage(c);
  e.wait = (re, ms = 60000) => new Promise((res, rej) => {
    const t = setTimeout(() => { e.cur = null; rej(new Error(`${name}: timeout waiting for ${re}`)); }, ms);
    e.cur = (l) => { if (re.test(l)) { clearTimeout(t); e.cur = null; res(l); } };
  });
  e.send('uci'); await e.wait(/uciok/);
  e.send('setoption name UCI_Variant value xiangqi');
  e.send('setoption name Threads value 1');
  e.send('setoption name Hash value 32');
  e.send('setoption name MultiPV value 1');
  if (nnue) {
    // FSF only accepts a net whose file name starts with the variant name
    sf.FS.writeFile('/xiangqi-net.nnue', fs.readFileSync(netFile));
    e.send('setoption name Use NNUE value true');
    e.send('setoption name EvalFile value /xiangqi-net.nnue');
  } else {
    e.send('setoption name Use NNUE value false');
  }
  e.send('isready'); await e.wait(/readyok/);
  // confirm which evaluator is really active
  e.send('position startpos'); e.send('eval'); await e.wait(/Final evaluation/, 20000);
  const mode = e.strings.filter((l) => /evaluation (using|enabled)|NNUE evaluation/.test(l)).slice(-1)[0] || '(no mode line)';
  const ok = nnue ? /NNUE evaluation using/.test(mode) : /classical evaluation enabled/.test(mode);
  console.log(`[${name}] ${mode}  ${ok ? 'OK' : 'WRONG MODE'}`);
  if (!ok) throw new Error(`${name} engine is not in the expected evaluation mode`);
  e.mode = mode;
  return e;
}

// Returns { move, cp (side to move perspective, mate -> +-10000), depth, nps }
async function think(e, movesList) {
  e.send(`position fen ${START}${movesList.length ? ' moves ' + movesList.join(' ') : ''}`);
  let cp = 0, depth = 0, nps = 0;
  const p = new Promise((res) => {
    e.cur = (l) => {
      const m = l.match(/^info depth (\d+).* score (cp|mate) (-?\d+).*? nps (\d+)/);
      if (m) {
        depth = +m[1]; nps = +m[4];
        cp = m[2] === 'cp' ? +m[3] : (+m[3] > 0 ? 10000 : -10000);
      }
      if (/^bestmove/.test(l)) { e.cur = null; res(l.split(/\s+/)[1]); }
    };
  });
  e.send(`go movetime ${MOVETIME}`);
  const move = await p;
  e.searches += 1; e.depthSum += depth; e.npsSum += nps;
  return { move, cp, depth, nps };
}

async function legalMoves(e, movesList) {
  e.send(`position fen ${START}${movesList.length ? ' moves ' + movesList.join(' ') : ''}`);
  const moves = [];
  const p = new Promise((res) => {
    e.cur = (l) => {
      const m = l.match(/^([a-i]\d+[a-i]\d+): \d+/);
      if (m) moves.push(m[1]);
      if (/^Nodes searched/.test(l)) { e.cur = null; res(); }
    };
  });
  e.send('go perft 1');
  await p;
  return moves;
}

async function randomOpening(e, plies) {
  const mv = [];
  for (let i = 0; i < plies; i += 1) {
    const legal = await legalMoves(e, mv);
    if (!legal.length) break;
    mv.push(legal[Math.floor(rnd() * legal.length)]);
  }
  return mv;
}

async function playGame(white, black, opening) {
  const moves = [...opening];
  const lowStreak = { [white.name]: 0, [black.name]: 0 };
  for (let ply = moves.length; ply < MAX_PLIES; ply += 1) {
    const mover = ply % 2 === 0 ? white : black;
    const opp = mover === white ? black : white;
    const r = await think(mover, moves);
    if (!r.move || r.move === '(none)') return { winner: opp.name, why: 'no legal moves', plies: ply };
    lowStreak[mover.name] = r.cp <= -1000 ? lowStreak[mover.name] + 1 : 0;
    if (lowStreak[mover.name] >= 3) return { winner: opp.name, why: 'resigned (score <= -10 pawns x3)', plies: ply };
    moves.push(r.move);
    const n = moves.length;
    if (n > 24) { // same 4-ply cycle repeated 3 times
      let rep = true;
      for (let i = 1; i <= 8; i += 1) if (moves[n - i] !== moves[n - i - 4]) { rep = false; break; }
      if (rep) return { winner: null, why: 'repetition', plies: n };
    }
  }
  return { winner: null, why: `ply cap ${MAX_PLIES}`, plies: moves.length };
}

(async () => {
  const net = await makeEngine('NNUE', true);
  const classic = await makeEngine('classical', false);
  out(`# ${new Date().toISOString()} movetime ${MOVETIME}ms, ${GAMES} games, net ${path.basename(netFile)}`);
  out(`# NNUE engine: ${net.mode}`);
  out(`# classical engine: ${classic.mode}`);

  // quick sanity: same position, fixed depth, both evaluators
  for (const [name, e] of [['NNUE', net], ['classical', classic]]) {
    const r = await think(e, ['h3e3']);
    out(`# sanity ${name}: after 1.h3e3 -> ${r.move} cp ${r.cp} depth ${r.depth} nps ${r.nps}`);
  }

  const tally = { NNUE: 0, classical: 0, draw: 0 };
  for (let g = 0; g < GAMES; g += 2) {
    const opening = await randomOpening(classic, parseInt(process.env.OPEN_PLIES || "2", 10));
    for (const [w, b] of [[net, classic], [classic, net]]) {
      if (g + (w === net ? 0 : 1) >= GAMES) continue;
      const t0 = Date.now();
      const res = await playGame(w, b, opening);
      const key = res.winner || 'draw';
      tally[key] += 1;
      out(`game ${tally.NNUE + tally.classical + tally.draw}: white=${w.name} black=${b.name} open=${opening.join(' ')} -> ${res.winner || 'draw'} (${res.why}, ${res.plies} plies, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }
  const total = tally.NNUE + tally.classical + tally.draw;
  const score = (tally.NNUE + tally.draw / 2) / total;
  out(`RESULT NNUE ${tally.NNUE} - classical ${tally.classical} - draws ${tally.draw} (score ${(score * 100).toFixed(1)}%)`);
  out(`avg depth NNUE ${(net.depthSum / net.searches).toFixed(1)} @ ${(net.npsSum / net.searches / 1000).toFixed(0)}k nps; classical ${(classic.depthSum / classic.searches).toFixed(1)} @ ${(classic.npsSum / classic.searches / 1000).toFixed(0)}k nps`);
  process.exit(0);
})().catch((e) => { console.error('match failed:', e); process.exit(1); });
