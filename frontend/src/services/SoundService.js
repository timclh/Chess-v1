/**
 * Sound Service
 *
 * Short game sounds synthesized with the Web Audio API: no audio files and no
 * dependencies. Every function is safe to call where audio is unavailable
 * (jsdom, old WebViews, autoplay blocked) and simply does nothing.
 *
 * The AudioContext is created lazily on the first user gesture, which is what
 * browsers and iOS WKWebView require before a page may make noise. Call
 * `initSound()` once when a screen that plays sounds mounts.
 *
 * Mute state is persisted in localStorage (key: config.storage.soundMuted);
 * sound is ON by default.
 */

import config from '../config';

export const SOUND = {
  MOVE: 'move',
  CAPTURE: 'capture',
  CHECK: 'check',
  WIN: 'win',
  LOSE: 'lose',
};

// Each sound is a list of notes: f = start frequency (Hz), to = optional glide
// target, t = start offset (s), d = duration (s), w = oscillator type, g = peak gain.
const TONES = {
  [SOUND.MOVE]: [{ f: 240, to: 120, t: 0, d: 0.09, w: 'triangle', g: 0.3 }],
  [SOUND.CAPTURE]: [
    { f: 180, to: 70, t: 0, d: 0.14, w: 'triangle', g: 0.4 },
    { f: 1100, to: 500, t: 0, d: 0.04, w: 'square', g: 0.06 },
  ],
  [SOUND.CHECK]: [
    { f: 660, t: 0, d: 0.1, w: 'sine', g: 0.3 },
    { f: 880, t: 0.11, d: 0.16, w: 'sine', g: 0.3 },
  ],
  [SOUND.WIN]: [523, 659, 784, 1047].map((f, i) => ({ f, t: i * 0.12, d: 0.18, w: 'triangle', g: 0.3 })),
  [SOUND.LOSE]: [392, 330, 262].map((f, i) => ({ f, t: i * 0.18, d: 0.26, w: 'sine', g: 0.3 })),
};

// ── Mute state ──────────────────────────────────────────────

const STORAGE_KEY = config.storage.soundMuted;
let mutedFallback = false; // used when localStorage is unavailable

export function isMuted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return raw === '1';
  } catch (_) { /* storage blocked: fall back to memory */ }
  return mutedFallback;
}

export function setMuted(muted) {
  mutedFallback = !!muted;
  try {
    localStorage.setItem(STORAGE_KEY, mutedFallback ? '1' : '0');
  } catch (_) { /* ignore */ }
  return mutedFallback;
}

/** Flip the mute state; returns the new state (true = muted). */
export function toggleMuted() {
  return setMuted(!isMuted());
}

// ── Audio context (created on the first user gesture) ───────

const GESTURE_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];
let ctx = null;
let unlocked = false; // a user gesture has been seen
let listening = false;

function audioContextClass() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function ensureContext() {
  if (ctx) return ctx;
  if (!unlocked) return null;
  const Ctor = audioContextClass();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch (_) {
    ctx = null;
  }
  return ctx;
}

function removeGestureListeners() {
  if (!listening || typeof document === 'undefined') return;
  listening = false;
  GESTURE_EVENTS.forEach((e) => document.removeEventListener(e, unlockAudio, true));
}

/**
 * Create / resume the AudioContext. Runs on the first user gesture; the
 * listeners stay until the context is actually running (iOS only honours some
 * gesture types).
 */
export function unlockAudio() {
  unlocked = true;
  const c = ensureContext();
  if (!c || c.state === 'running') {
    removeGestureListeners();
    return;
  }
  try {
    const p = c.resume();
    if (p && typeof p.then === 'function') {
      p.then(() => { if (c.state === 'running') removeGestureListeners(); }, () => {});
    }
  } catch (_) { /* ignore */ }
}

/** Start waiting for the first user gesture. Idempotent. */
export function initSound() {
  if (listening || unlocked || typeof document === 'undefined') return;
  listening = true;
  GESTURE_EVENTS.forEach((e) => document.addEventListener(e, unlockAudio, true));
}

// ── Public API ──────────────────────────────────────────────

/**
 * Choose the sound for a move that has just been played.
 * Priority: game over > check > capture > plain move.
 */
export function soundForMove({ captured = false, inCheck = false, gameOver = false, won = false } = {}) {
  if (gameOver) return won ? SOUND.WIN : SOUND.LOSE;
  if (inCheck) return SOUND.CHECK;
  if (captured) return SOUND.CAPTURE;
  return SOUND.MOVE;
}

/**
 * Play a sound by name. Returns true if it was scheduled; never throws.
 */
export function playSound(name) {
  try {
    const notes = TONES[name];
    if (!notes || isMuted()) return false;

    const c = ensureContext();
    if (!c) return false;
    if (c.state !== 'running') {
      // Not unlocked yet (or suspended by the OS): try to wake it, skip this one
      const p = typeof c.resume === 'function' ? c.resume() : null;
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return false;
    }

    const now = c.currentTime;
    notes.forEach(({ f, to, t, d, w, g }) => {
      const start = now + t;
      const end = start + d;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = w;
      osc.frequency.setValueAtTime(f, start);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(g, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
    return true;
  } catch (_) {
    return false;
  }
}
