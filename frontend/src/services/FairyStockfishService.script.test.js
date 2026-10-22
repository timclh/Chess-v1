/**
 * Loading the engine script: the engine's worker needs this instance's blob URL for the
 * script. A `window.Stockfish` left on the page by an earlier instance (a hot reload in
 * development) must not make the instance skip creating it - the worker would then try
 * to import a relative URL from inside a blob and never answer ("Timeout waiting for uciok").
 */
import service from './FairyStockfishService';

let appended;

beforeEach(() => {
  appended = [];
  service._engineScriptBlobUrl = null;
  delete window.Stockfish;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'window.Stockfish = function () {};' });
  URL.createObjectURL = jest.fn(() => 'blob:engine-script');
  jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
    appended.push(script);
    window.Stockfish = function Stockfish() {};
    setTimeout(() => script.onload && script.onload(), 0);
    return script;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.Stockfish;
  service._engineScriptBlobUrl = null;
});

test('loads the script through a blob URL and remembers it', async () => {
  const factory = await service._loadEngineScript();

  expect(global.fetch).toHaveBeenCalledWith('/fairy-stockfish.js');
  expect(service._engineScriptBlobUrl).toBe('blob:engine-script');
  expect(appended).toHaveLength(1);
  expect(factory).toBe(window.Stockfish);
});

test('a second call does not load it again', async () => {
  await service._loadEngineScript();
  global.fetch.mockClear();

  await service._loadEngineScript();

  expect(global.fetch).not.toHaveBeenCalled();
  expect(appended).toHaveLength(1);
});

test('a script left on the page by an earlier instance is not enough: this instance still needs its blob URL', async () => {
  window.Stockfish = function Leftover() {}; // from before the hot reload
  expect(service._engineScriptBlobUrl).toBeNull();

  await service._loadEngineScript();

  expect(service._engineScriptBlobUrl).toBe('blob:engine-script');
  expect(global.fetch).toHaveBeenCalledWith('/fairy-stockfish.js');
});
