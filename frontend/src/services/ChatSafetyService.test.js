/**
 * Tests for the chat profanity filter, the block list and the report payload.
 */
import {
  filterText,
  containsProfanity,
  buildProfanityPattern,
  getBlockedUsers,
  isBlocked,
  blockUser,
  unblockUser,
  buildReport,
  REPORT_REASONS,
} from './ChatSafetyService';
import { PROFANITY_EN, PROFANITY_ZH } from '../config/profanity';

const BLOCK_KEY = 'qi_arena_blocked_users';

describe('filterText', () => {
  test('masks English profanity case-insensitively, keeping length', () => {
    expect(filterText('what the fuck')).toBe('what the ****');
    expect(filterText('What The FUCK')).toBe('What The ****');
    expect(filterText('shit')).toBe('****');
  });

  test('masks common suffix forms', () => {
    expect(filterText('this is fucking bad')).toBe('this is ******* bad');
    expect(filterText('you bitches')).toBe('you *******');
    expect(filterText('shitty move')).toBe('****** move');
  });

  test('masks Chinese profanity as substrings', () => {
    expect(filterText('你这个傻逼')).toBe('你这个**');
    expect(filterText('他妈的！')).toBe('***！');
    expect(filterText('去死吧')).toBe('**吧');
  });

  test('prefers the longest Chinese match', () => {
    // 他妈的 contains 妈的; both are listed, the longer one must win
    expect(filterText('他妈的')).toBe('***');
  });

  test('masks several words in one message', () => {
    expect(filterText('shit and 傻逼 and fuck')).toBe('**** and ** and ****');
  });

  test('leaves clean text and innocent look-alikes alone', () => {
    const clean = [
      'good game, well played',
      '好棋！将军',
      'classic assessment of the Scunthorpe class',
      'Pussycat and cocktail',
      'I will analyse the position',
    ];
    clean.forEach((text) => expect(filterText(text)).toBe(text));
  });

  test('respects word boundaries for ASCII words', () => {
    expect(filterText('shitake mushrooms')).toBe('shitake mushrooms');
    expect(filterText('fuck, you')).toBe('****, you');
    expect(filterText('(shit)')).toBe('(****)');
  });

  test('is safe for non-string and empty input', () => {
    expect(filterText(undefined)).toBe('');
    expect(filterText(null)).toBe('');
    expect(filterText(42)).toBe('');
    expect(filterText('')).toBe('');
  });

  test('is idempotent', () => {
    const once = filterText('fuck 傻逼');
    expect(filterText(once)).toBe(once);
  });

  test('does not carry regex state between calls (global flag)', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(filterText('fuck')).toBe('****');
      expect(containsProfanity('fuck')).toBe(true);
    }
  });

  test('every word in the starter lists is masked', () => {
    [...PROFANITY_EN, ...PROFANITY_ZH].forEach((word) => {
      expect(filterText(`x ${word} x`)).not.toContain(word);
    });
  });

  test('custom lists and an empty list work', () => {
    const custom = buildProfanityPattern(['heck']);
    expect(filterText('what the heck', custom)).toBe('what the ****');
    expect(filterText('fuck', custom)).toBe('fuck');
    expect(buildProfanityPattern([])).toBeNull();
    expect(filterText('fuck', buildProfanityPattern([]))).toBe('fuck');
  });
});

describe('containsProfanity', () => {
  test('detects and rejects', () => {
    expect(containsProfanity('you are a bastard')).toBe(true);
    expect(containsProfanity('nice move')).toBe(false);
    expect(containsProfanity(undefined)).toBe(false);
  });
});

describe('block list', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('starts empty', () => {
    expect(getBlockedUsers()).toEqual([]);
    expect(isBlocked('Alice')).toBe(false);
  });

  test('blockUser persists and isBlocked finds the name', () => {
    expect(blockUser('Alice')).toEqual(['Alice']);
    expect(getBlockedUsers()).toEqual(['Alice']);
    expect(JSON.parse(localStorage.getItem(BLOCK_KEY))).toEqual(['Alice']);
    expect(isBlocked('Alice')).toBe(true);
    expect(isBlocked('Bob')).toBe(false);
  });

  test('names compare case-insensitively and ignore extra whitespace', () => {
    blockUser('  Alice   Smith ');
    expect(isBlocked('alice smith')).toBe(true);
    expect(isBlocked('ALICE  SMITH')).toBe(true);
    expect(blockUser('ALICE SMITH')).toEqual(['Alice Smith']); // no duplicate
  });

  test('blank names are never blocked', () => {
    expect(blockUser('   ')).toEqual([]);
    expect(blockUser(undefined)).toEqual([]);
    expect(isBlocked('')).toBe(false);
    expect(isBlocked(undefined)).toBe(false);
  });

  test('unblockUser removes only that name and persists', () => {
    blockUser('Alice');
    blockUser('Bob');
    expect(unblockUser('alice')).toEqual(['Bob']);
    expect(getBlockedUsers()).toEqual(['Bob']);
    expect(isBlocked('Alice')).toBe(false);
    expect(unblockUser('nobody')).toEqual(['Bob']);
  });

  test('isBlocked can check against a list held in component state', () => {
    expect(isBlocked('Eve', ['eve'])).toBe(true);
    expect(isBlocked('Eve', [])).toBe(false);
  });

  test('the list is bounded (oldest entries drop off)', () => {
    for (let i = 0; i < 120; i += 1) blockUser(`user${i}`);
    const list = getBlockedUsers();
    expect(list).toHaveLength(100);
    expect(list[0]).toBe('user20');
    expect(list[99]).toBe('user119');
  });

  test('corrupt storage reads as an empty list', () => {
    localStorage.setItem(BLOCK_KEY, '{not json');
    expect(getBlockedUsers()).toEqual([]);
    localStorage.setItem(BLOCK_KEY, JSON.stringify({ a: 1 }));
    expect(getBlockedUsers()).toEqual([]);
    localStorage.setItem(BLOCK_KEY, JSON.stringify(['ok', 5, '', null]));
    expect(getBlockedUsers()).toEqual(['ok']);
  });

  test('storage failures do not throw and still return the new list', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      expect(() => blockUser('Alice')).not.toThrow();
      expect(blockUser('Alice')).toEqual(['Alice']);
    } finally {
      setItem.mockRestore();
    }
  });
});

describe('buildReport', () => {
  test('has the shape the backend expects', () => {
    expect(buildReport({ reportedName: ' Bob ', text: 'rude', reason: 'abuse' })).toEqual({
      type: 'report',
      reportedName: 'Bob',
      text: 'rude',
      reason: 'abuse',
    });
  });

  test('defaults the reason and bounds the text', () => {
    const report = buildReport({ reportedName: 'Bob', text: 'x'.repeat(2000) });
    expect(report.reason).toBe('other');
    expect(report.text).toHaveLength(500);
  });

  test('offers bilingual reasons ending with "other"', () => {
    expect(REPORT_REASONS.length).toBeGreaterThanOrEqual(3);
    expect(REPORT_REASONS[REPORT_REASONS.length - 1].value).toBe('other');
    REPORT_REASONS.forEach((r) => expect(r.label).toContain(' / '));
  });
});
