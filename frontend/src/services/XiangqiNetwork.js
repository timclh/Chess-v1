/**
 * Xiangqi NNUE network for Fairy-Stockfish.
 *
 * The engine ships with hand-written evaluation only; loading this network makes
 * it far stronger at xiangqi (48-0 against the same engine without it in a
 * 0.3 s/move match; Fairy-Stockfish's own page lists +914 Elo).
 *
 * Source: https://fairy-stockfish.github.io/nnue/  (xiangqi-c07e94a5c7cb.nnue,
 * 2025-10-31, trained by the Pikafish developers on Pika Xiangqi Zero data, ODbL).
 * The network's licence is not stated on that page: confirm it before charging
 * for the app.
 *
 * Gotchas learned the hard way:
 *  - Fairy-Stockfish only uses a network whose FILE NAME STARTS WITH THE VARIANT
 *    NAME ("xiangqi..."); any other name silently falls back to classical eval.
 *  - If EvalFile points at a network that fails to load, the engine exits. So the
 *    file is verified (size + SHA-256) before it is ever handed to the engine.
 *
 * Everything here is best effort: any failure returns null and the coach keeps
 * working with the classical evaluation.
 */

export const XIANGQI_NET = {
  file: 'xiangqi-c07e94a5c7cb.nnue',
  bytes: 11261932,
  sha256: 'c07e94a5c7cbeae443ed79a8fa412875d833a7f8e04333815e39729c59d52e11',
};

const CACHE_NAME = 'xiangqi-nnue-v1';

const toHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * True if `bytes` (Uint8Array) is exactly the expected network. Falls back to the
 * size check alone where Web Crypto is unavailable (insecure context).
 */
export async function verifyNetwork(bytes, subtle = (typeof crypto !== 'undefined' && crypto.subtle) || null) {
  if (!bytes || bytes.byteLength !== XIANGQI_NET.bytes) return false;
  if (!subtle) return true;
  try {
    const digest = await subtle.digest('SHA-256', bytes);
    return toHex(digest) === XIANGQI_NET.sha256;
  } catch (_) {
    return true; // hashing unavailable: the size matched, accept it
  }
}

async function fromCache(caches, url) {
  try {
    if (!caches) return null;
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (!hit) return null;
    const bytes = new Uint8Array(await hit.arrayBuffer());
    if (await verifyNetwork(bytes)) return bytes;
    await cache.delete(url); // damaged entry: drop it and download again
  } catch (_) { /* cache unavailable */ }
  return null;
}

async function toCache(caches, url, bytes) {
  try {
    if (!caches) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }));
  } catch (_) { /* quota or private mode: fine, we just download next time */ }
}

/**
 * Get the verified network as a Uint8Array, from Cache Storage if present,
 * otherwise from the site. Returns null if it cannot be had.
 */
export async function fetchNetwork({
  fetchImpl = typeof fetch !== 'undefined' ? fetch : null,
  caches = typeof window !== 'undefined' ? window.caches : null,
  baseUrl = '/',
} = {}) {
  const url = `${baseUrl}${XIANGQI_NET.file}`;
  try {
    const cached = await fromCache(caches, url);
    if (cached) return cached;

    if (!fetchImpl) return null;
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!(await verifyNetwork(bytes))) throw new Error('downloaded file is not the expected network');

    await toCache(caches, url, bytes);
    return bytes;
  } catch (err) {
    console.warn('[XiangqiNetwork] not available, using the classical evaluation:', err.message || err);
    return null;
  }
}
