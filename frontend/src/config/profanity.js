/**
 * Starter word lists for the chat profanity filter (see ChatSafetyService).
 *
 * These are deliberately short and conservative: English words are matched on
 * word boundaries (so "class" is safe), Chinese words as substrings. Matching
 * is case-insensitive. Extend the lists here; no other file needs to change.
 *
 * ASCII entries also match common suffixes (fucking, bitches, shitty, ...).
 */

export const PROFANITY_EN = [
  'fuck', 'motherfucker', 'shit', 'bullshit', 'bitch', 'bastard', 'asshole',
  'dickhead', 'cunt', 'pussy', 'slut', 'whore', 'wanker', 'twat',
  'nigger', 'nigga', 'faggot', 'retard',
];

export const PROFANITY_ZH = [
  '傻逼', '傻屄', '傻b', '煞笔', '沙比', '操你妈', '草你妈', '你妈逼', '妈逼',
  '他妈的', '妈的', '王八蛋', '狗娘养', '婊子', '贱人', '贱货', '混蛋', '滚蛋',
  '去死', 'nmsl', 'cnm',
];

/** Character used to mask each letter of a filtered word */
export const MASK_CHAR = '*';
