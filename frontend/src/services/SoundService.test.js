/**
 * Tests for SoundService: mute persistence, safe no-ops when Web Audio is
 * unavailable, lazy AudioContext creation on the first user gesture, and the
 * choice of sound for a move.
 *
 * The module keeps its AudioContext and gesture state at module level, so each
 * test loads a fresh copy (jest.resetModules + require).
 */

const MUTE_KEY = 'qi_arena_sound_muted';
const ALL_SOUNDS = ['move', 'capture', 'check', 'win', 'lose'];

// Minimal Web Audio fake that records what was scheduled
function installFakeAudio({ state = 'running', resumes = true } = {}) {
  const log = { contexts: 0, oscillators: [] };
  class FakeAudioContext {
    constructor() {
      log.contexts += 1;
      this.state = state;
      this.currentTime = 0;
      this.destination = {};
    }
    resume() {
      if (resumes) this.state = 'running';
      return Promise.resolve();
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
    createOscillator() {
      const osc = {
        type: 'sine',
        freqs: [],
        started: [],
        frequency: {
          setValueAtTime(v) { osc.freqs.push(v); },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        start(t) { osc.started.push(t); },
        stop() {},
      };
      log.oscillators.push(osc);
      return osc;
    }
  }
  window.AudioContext = FakeAudioContext;
  return log;
}

function loadService() {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('./SoundService');
}

describe('SoundService', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  afterEach(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  describe('mute state', () => {
    test('sound is on by default', () => {
      const svc = loadService();
      expect(svc.isMuted()).toBe(false);
    });

    test('setMuted / toggleMuted persist in localStorage and survive a reload', () => {
      let svc = loadService();
      expect(svc.setMuted(true)).toBe(true);
      expect(localStorage.getItem(MUTE_KEY)).toBe('1');

      svc = loadService(); // fresh module = fresh page load
      expect(svc.isMuted()).toBe(true);

      expect(svc.toggleMuted()).toBe(false);
      expect(localStorage.getItem(MUTE_KEY)).toBe('0');
      svc = loadService();
      expect(svc.isMuted()).toBe(false);
    });

    test('falls back to memory when localStorage throws', () => {
      const svc = loadService();
      const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      try {
        expect(svc.isMuted()).toBe(false);
        expect(() => svc.setMuted(true)).not.toThrow();
        expect(svc.isMuted()).toBe(true);
      } finally {
        getItem.mockRestore();
        setItem.mockRestore();
      }
    });
  });

  describe('without Web Audio', () => {
    test('nothing throws and nothing plays', () => {
      const svc = loadService();
      expect(window.AudioContext).toBeUndefined();
      expect(() => svc.initSound()).not.toThrow();
      expect(() => svc.unlockAudio()).not.toThrow();
      ALL_SOUNDS.forEach((name) => {
        expect(() => svc.playSound(name)).not.toThrow();
        expect(svc.playSound(name)).toBe(false);
      });
    });

    test('a constructor that throws is tolerated', () => {
      window.AudioContext = function BrokenContext() {
        throw new Error('not allowed');
      };
      const svc = loadService();
      svc.unlockAudio();
      expect(svc.playSound('move')).toBe(false);
    });
  });

  describe('with Web Audio', () => {
    test('the AudioContext is created lazily on the first user gesture', () => {
      const log = installFakeAudio();
      const svc = loadService();
      svc.initSound();

      // Nothing yet: no gesture
      expect(log.contexts).toBe(0);
      expect(svc.playSound('move')).toBe(false);
      expect(log.contexts).toBe(0);

      document.dispatchEvent(new Event('pointerdown'));
      expect(log.contexts).toBe(1);
      expect(svc.playSound('move')).toBe(true);
      expect(log.contexts).toBe(1); // reused
    });

    test('each sound schedules its own notes', () => {
      const log = installFakeAudio();
      const svc = loadService();
      svc.unlockAudio();

      const play = (name) => {
        log.oscillators.length = 0;
        expect(svc.playSound(name)).toBe(true);
        return log.oscillators.map((o) => o.freqs[0]);
      };

      expect(play('move')).toEqual([240]);
      expect(play('capture')).toHaveLength(2);
      expect(play('check')).toEqual([660, 880]);
      expect(play('win')).toEqual([523, 659, 784, 1047]);
      expect(play('lose')).toEqual([392, 330, 262]);
    });

    test('every sound has its own note pattern', () => {
      const log = installFakeAudio();
      const svc = loadService();
      svc.unlockAudio();
      const notes = (name) => {
        log.oscillators.length = 0;
        svc.playSound(name);
        return JSON.stringify(log.oscillators.map((o) => [o.type, o.freqs]));
      };
      const all = ALL_SOUNDS.map(notes);
      expect(new Set(all).size).toBe(ALL_SOUNDS.length);
    });

    test('unknown names and muted state play nothing', () => {
      const log = installFakeAudio();
      const svc = loadService();
      svc.unlockAudio();

      expect(svc.playSound('nope')).toBe(false);
      expect(log.oscillators).toHaveLength(0);

      svc.setMuted(true);
      expect(svc.playSound('capture')).toBe(false);
      expect(log.oscillators).toHaveLength(0);

      svc.setMuted(false);
      expect(svc.playSound('capture')).toBe(true);
      expect(log.oscillators.length).toBeGreaterThan(0);
    });

    test('a suspended context is resumed on the gesture, then plays', () => {
      const log = installFakeAudio({ state: 'suspended' });
      const svc = loadService();
      svc.unlockAudio();

      expect(svc.playSound('move')).toBe(true);
      expect(log.oscillators).toHaveLength(1);
    });

    test('a context the browser keeps suspended plays nothing (no stale queue)', () => {
      const log = installFakeAudio({ state: 'suspended', resumes: false });
      const svc = loadService();
      svc.unlockAudio();

      expect(svc.playSound('move')).toBe(false);
      expect(log.oscillators).toHaveLength(0);
    });
  });

  describe('soundForMove', () => {
    test('plain move, capture and check', () => {
      const { soundForMove } = loadService();
      expect(soundForMove({})).toBe('move');
      expect(soundForMove()).toBe('move');
      expect(soundForMove({ captured: true })).toBe('capture');
      expect(soundForMove({ inCheck: true })).toBe('check');
    });

    test('check outranks capture; game over outranks both', () => {
      const { soundForMove } = loadService();
      expect(soundForMove({ captured: true, inCheck: true })).toBe('check');
      expect(soundForMove({ captured: true, inCheck: true, gameOver: true, won: true })).toBe('win');
      expect(soundForMove({ captured: true, inCheck: true, gameOver: true, won: false })).toBe('lose');
    });
  });
});
