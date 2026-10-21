/**
 * XiangqiNetwork: the engine must only ever be handed the exact network file
 * (a bad file makes Fairy-Stockfish exit), and anything that goes wrong has to
 * end as "no network" rather than an error.
 *
 * The real 11 MB network from public/ is used for the happy paths.
 */
import fs from 'fs';
import path from 'path';
import { webcrypto } from 'crypto';
import { XIANGQI_NET, verifyNetwork, fetchNetwork } from './XiangqiNetwork';

const NET_PATH = path.join(__dirname, '..', '..', 'public', XIANGQI_NET.file);
const realBytes = () => new Uint8Array(fs.readFileSync(NET_PATH));

const realCrypto = global.crypto;
beforeAll(() => {
  // jsdom has no Web Crypto
  Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
  global.Response = global.Response || class FakeResponse {
    constructor(body) { this._body = body; }
    async arrayBuffer() { return this._body.buffer.slice(this._body.byteOffset, this._body.byteOffset + this._body.byteLength); }
  };
});
afterAll(() => {
  Object.defineProperty(global, 'crypto', { value: realCrypto, configurable: true });
});

const okResponse = (bytes) => ({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

// A Cache Storage stand-in that keeps what is put into it
function fakeCaches(initial) {
  const store = new Map(initial || []);
  const cache = {
    match: async (url) => (store.has(url) ? { arrayBuffer: async () => { const b = store.get(url); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } } : undefined),
    put: async (url, response) => { store.set(url, new Uint8Array(await response.arrayBuffer())); },
    delete: async (url) => store.delete(url),
  };
  return { store, open: async () => cache };
}

describe('the network file shipped in public/', () => {
  test('is the expected size and hash, and its name starts with the variant (the engine ignores other names)', async () => {
    expect(XIANGQI_NET.file.startsWith('xiangqi')).toBe(true);
    expect(XIANGQI_NET.sha256.startsWith(XIANGQI_NET.file.match(/-([0-9a-f]{12})\./)[1])).toBe(true);
    expect(await verifyNetwork(realBytes())).toBe(true);
  });
});

describe('verifyNetwork', () => {
  test('rejects a wrong size, a same-size file with different content, and nothing', async () => {
    expect(await verifyNetwork(new Uint8Array(10))).toBe(false);
    const tampered = realBytes();
    tampered[1000] ^= 0xff;
    expect(await verifyNetwork(tampered)).toBe(false);
    expect(await verifyNetwork(null)).toBe(false);
  });

  test('without Web Crypto it accepts a file of the right size', async () => {
    expect(await verifyNetwork(new Uint8Array(XIANGQI_NET.bytes), null)).toBe(true);
  });
});

describe('fetchNetwork', () => {
  test('downloads, verifies and caches the network', async () => {
    const bytes = realBytes();
    const fetchImpl = jest.fn(async () => okResponse(bytes));
    const caches = fakeCaches();

    const got = await fetchNetwork({ fetchImpl, caches });

    expect(got.byteLength).toBe(XIANGQI_NET.bytes);
    expect(fetchImpl).toHaveBeenCalledWith(`/${XIANGQI_NET.file}`);
    expect(caches.store.has(`/${XIANGQI_NET.file}`)).toBe(true);
  });

  test('the second call comes from the cache without touching the network', async () => {
    const bytes = realBytes();
    const caches = fakeCaches([[`/${XIANGQI_NET.file}`, bytes]]);
    const fetchImpl = jest.fn();

    const got = await fetchNetwork({ fetchImpl, caches });

    expect(got.byteLength).toBe(XIANGQI_NET.bytes);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('a damaged cache entry is dropped and downloaded again', async () => {
    const bad = new Uint8Array(XIANGQI_NET.bytes); // right size, wrong content
    const caches = fakeCaches([[`/${XIANGQI_NET.file}`, bad]]);
    const fetchImpl = jest.fn(async () => okResponse(realBytes()));

    const got = await fetchNetwork({ fetchImpl, caches });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(await verifyNetwork(got)).toBe(true);
    expect(await verifyNetwork(caches.store.get(`/${XIANGQI_NET.file}`))).toBe(true);
  });

  test.each([
    ['an HTTP error', async () => ({ ok: false, status: 404 })],
    ['a truncated download', async () => okResponse(new Uint8Array(1234))],
    ['a network failure', async () => { throw new Error('offline'); }],
  ])('returns null (never throws) on %s', async (_label, fetchImpl) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const caches = fakeCaches();
    expect(await fetchNetwork({ fetchImpl, caches })).toBeNull();
    expect(caches.store.size).toBe(0); // nothing bad gets cached
    warn.mockRestore();
  });

  test('works without Cache Storage', async () => {
    const got = await fetchNetwork({ fetchImpl: async () => okResponse(realBytes()), caches: null });
    expect(got.byteLength).toBe(XIANGQI_NET.bytes);
  });
});
