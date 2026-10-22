/**
 * Engine start-up: prewarmEngine starts the engine early only where it can and
 * should, never twice, and remembers that this device uses it.
 */
const mockInit = jest.fn();

jest.mock('./FairyStockfishService', () => ({
  __esModule: true,
  default: {
    init: (...args) => mockInit(...args),
    stop: jest.fn(),
    destroy: jest.fn(),
    nnueActive: true,
  },
  parseUCIMove: jest.fn(),
  toUCIMove: jest.fn(),
}));

function load() {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('./XiangqiCoachService');
}

const setIsolated = (v) => Object.defineProperty(window, 'crossOriginIsolated', { value: v, configurable: true });
const setConnection = (c) => Object.defineProperty(navigator, 'connection', { value: c, configurable: true });
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  mockInit.mockReset();
  mockInit.mockResolvedValue(true);
  localStorage.clear();
  setIsolated(true);
  setConnection(undefined);
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

test('starts the engine once, however often it is asked', async () => {
  const svc = load();
  svc.prewarmEngine();
  svc.prewarmEngine();
  svc.prewarmOnIntent.onPointerEnter();
  await flush();
  svc.prewarmEngine();
  expect(mockInit).toHaveBeenCalledTimes(1);
  expect(svc.isEngineReady()).toBe(true);
});

test('does nothing where the engine cannot run: not isolated, offline, data saver, slow connection', async () => {
  let svc = load();
  setIsolated(false);
  svc.prewarmEngine();

  setIsolated(true);
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  svc = load();
  svc.prewarmEngine();

  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  setConnection({ saveData: true, effectiveType: '4g' });
  svc = load();
  svc.prewarmEngine();

  setConnection({ saveData: false, effectiveType: '3g' });
  svc = load();
  svc.prewarmEngine();

  await flush();
  expect(mockInit).not.toHaveBeenCalled();
});

test('a fast connection is fine', async () => {
  setConnection({ saveData: false, effectiveType: '4g' });
  load().prewarmEngine();
  await flush();
  expect(mockInit).toHaveBeenCalledTimes(1);
});

test('remembers that the engine was used, so returning players get it at start-up', async () => {
  const svc = load();
  expect(svc.shouldPrewarmOnStart()).toBe(false);
  await svc.initCoachEngine();
  expect(svc.shouldPrewarmOnStart()).toBe(true);
});

test('a failed start does not retry on every hover and never throws', async () => {
  mockInit.mockResolvedValue(false);
  const svc = load();
  svc.prewarmEngine();
  await flush();
  svc.prewarmEngine();
  await flush();
  expect(mockInit).toHaveBeenCalledTimes(1);
  expect(svc.isEngineReady()).toBe(false);
  expect(svc.shouldPrewarmOnStart()).toBe(false);
});
