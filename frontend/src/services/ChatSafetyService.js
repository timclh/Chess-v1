/**
 * Chat Safety Service
 *
 * Client-side tools for user-generated chat content (App Store guideline 1.2):
 *  - filterText():   masks words from the starter profanity lists
 *  - block list:     per-device list of display names whose messages are hidden
 *  - buildReport():  the `report` message sent to the backend
 *
 * Everything is best-effort and client-side: names are not authenticated, and
 * a modified client can skip the filter. The server records reports only.
 */

import config from '../config';
import { PROFANITY_EN, PROFANITY_ZH, MASK_CHAR } from '../config/profanity';

// ── Profanity filter ────────────────────────────────────────

const ASCII_WORD = /^[\u0020-\u007e]+$/; // printable ASCII only
const ASCII_SUFFIX = '(?:s|es|ed|er|ers|ing|in|y|ty)?';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const longestFirst = (a, b) => b.length - a.length;

/**
 * Build a global, case-insensitive matcher for the given word lists.
 * ASCII words match whole words (plus common suffixes); others match anywhere.
 */
export function buildProfanityPattern(words = [...PROFANITY_EN, ...PROFANITY_ZH]) {
  const clean = words
    .filter((w) => typeof w === 'string' && w.trim())
    .map((w) => w.trim().toLowerCase())
    .sort(longestFirst)
    .map(escapeRegExp);
  const ascii = clean.filter((w) => ASCII_WORD.test(w));
  const other = clean.filter((w) => !ASCII_WORD.test(w));

  const parts = [];
  if (ascii.length) parts.push(`\\b(?:${ascii.join('|')})${ASCII_SUFFIX}\\b`);
  if (other.length) parts.push(`(?:${other.join('|')})`);
  return parts.length ? new RegExp(parts.join('|'), 'gi') : null;
}

const defaultPattern = buildProfanityPattern();

/**
 * Mask profanity in `text` (each letter of a match becomes `*`).
 * Always returns a string; non-strings become ''.
 */
export function filterText(text, pattern = defaultPattern) {
  if (typeof text !== 'string' || !text) return '';
  if (!pattern) return text;
  return text.replace(pattern, (match) => MASK_CHAR.repeat(match.length));
}

/** True if `text` contains something filterText would mask */
export function containsProfanity(text, pattern = defaultPattern) {
  return typeof text === 'string' && !!pattern && filterText(text, pattern) !== text;
}

// ── Block list ──────────────────────────────────────────────

const BLOCK_KEY = config.storage.blockedUsers;
const MAX_BLOCKED = 100;
const MAX_NAME_LENGTH = 40;

const tidyName = (name) => String(name == null ? '' : name).trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
const nameKey = (name) => tidyName(name).toLowerCase();

/** Display names currently blocked on this device (original spelling) */
export function getBlockedUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(BLOCK_KEY));
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'string' && n.trim()) : [];
  } catch (_) {
    return [];
  }
}

function saveBlocked(list) {
  try {
    localStorage.setItem(BLOCK_KEY, JSON.stringify(list));
  } catch (_) { /* storage blocked: the list still lives in component state */ }
  return list;
}

/** Whether `name` is on the block list (names compare case-insensitively) */
export function isBlocked(name, list = getBlockedUsers()) {
  const key = nameKey(name);
  return !!key && list.some((n) => nameKey(n) === key);
}

/** Add a name to the block list; returns the new list */
export function blockUser(name) {
  const list = getBlockedUsers();
  const clean = tidyName(name);
  if (!clean || isBlocked(clean, list)) return list;
  return saveBlocked([...list, clean].slice(-MAX_BLOCKED));
}

/** Remove a name from the block list; returns the new list */
export function unblockUser(name) {
  const key = nameKey(name);
  return saveBlocked(getBlockedUsers().filter((n) => nameKey(n) !== key));
}

// ── Reports ─────────────────────────────────────────────────

export const REPORT_REASONS = [
  { value: 'abuse', label: '辱骂骚扰 / Harassment or abuse' },
  { value: 'spam', label: '垃圾信息 / Spam' },
  { value: 'inappropriate', label: '不当内容 / Inappropriate content' },
  { value: 'other', label: '其他 / Other' },
];

/** The payload for the backend `report` message */
export function buildReport({ reportedName, text, reason = 'other' }) {
  return {
    type: 'report',
    reportedName: tidyName(reportedName),
    text: String(text == null ? '' : text).slice(0, 500),
    reason,
  };
}
