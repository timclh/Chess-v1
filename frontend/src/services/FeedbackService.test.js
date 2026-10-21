/**
 * FeedbackService: each game event plays the right sound and the right haptic.
 * Both underlying services are replaced by recorders.
 */
const mockSounds = [];
const mockHaptics = [];

jest.mock('./SoundService', () => {
  const actual = jest.requireActual('./SoundService');
  return { ...actual, playSound: (name) => { mockSounds.push(name); return true; } };
});

jest.mock('./CapacitorService', () => ({
  hapticTap: () => { mockHaptics.push('tap'); return Promise.resolve(); },
  hapticImpact: () => { mockHaptics.push('impact'); return Promise.resolve(); },
  hapticNotification: (type) => { mockHaptics.push(`notify:${type}`); return Promise.resolve(); },
}));

const { moveFeedback, chessMoveFeedback, selectFeedback, placeFeedback } = require('./FeedbackService');
const chessModule = require('chess.js');
const Chess = chessModule.Chess || chessModule.default || chessModule;

beforeEach(() => {
  mockSounds.length = 0;
  mockHaptics.length = 0;
});

describe('moveFeedback', () => {
  test.each([
    [{}, 'move', 'tap'],
    [{ captured: true }, 'capture', 'impact'],
    [{ inCheck: true }, 'check', 'notify:warning'],
    [{ gameOver: true, won: true }, 'win', 'notify:success'],
    [{ gameOver: true, won: false }, 'lose', 'notify:error'],
  ])('%j -> %s sound and %s haptic', (info, sound, haptic) => {
    expect(moveFeedback(info)).toBe(sound);
    expect(mockSounds).toEqual([sound]);
    expect(mockHaptics).toEqual([haptic]);
  });
});

describe('chessMoveFeedback', () => {
  test('plain move, capture and check', () => {
    const game = new Chess();
    chessMoveFeedback(game, game.move('e4'), 'w');
    game.move('d5');
    chessMoveFeedback(game, game.move('exd5'), 'w');
    expect(mockSounds).toEqual(['move', 'capture']);

    const checkGame = new Chess('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1');
    chessMoveFeedback(checkGame, checkGame.move('Re7+'), 'w');
    expect(mockSounds[2]).toBe('check');
  });

  test("checkmate sounds like a win for the mover's side and a loss for the other", () => {
    const fen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    const asWhite = new Chess(fen);
    chessMoveFeedback(asWhite, asWhite.move('Ra8#'), 'w');
    const asBlack = new Chess(fen);
    chessMoveFeedback(asBlack, asBlack.move('Ra8#'), 'b');
    expect(mockSounds).toEqual(['win', 'lose']);
  });

  test('a draw ends quietly with a plain move sound', () => {
    const stalemate = new Chess('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1');
    const mv = stalemate.move('Qf7'); // black to move has no legal moves, not in check
    expect(stalemate.in_stalemate()).toBe(true);
    chessMoveFeedback(stalemate, mv, 'w');
    expect(mockSounds[mockSounds.length - 1]).toBe('move');
  });

  test('ignores missing input', () => {
    expect(chessMoveFeedback(null, null, 'w')).toBeNull();
    expect(mockSounds).toEqual([]);
  });
});

describe('selectFeedback and placeFeedback', () => {
  test('selecting a piece ticks and taps', () => {
    selectFeedback();
    expect(mockSounds).toEqual(['select']);
    expect(mockHaptics).toEqual(['tap']);
  });

  test('placing a stone, winning and losing', () => {
    placeFeedback();
    placeFeedback({ gameOver: true, won: true });
    placeFeedback({ gameOver: true, won: false });
    expect(mockSounds).toEqual(['place', 'win', 'lose']);
    expect(mockHaptics).toEqual(['tap', 'notify:success', 'notify:error']);
  });
});
