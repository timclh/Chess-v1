/**
 * Notification Service
 * 
 * Handles browser push notifications for:
 * - Daily puzzle reminders
 * - Streak reminders (don't break your streak!)
 * - Multiplayer game invites
 * 
 * Uses the Notifications API (no Firebase Cloud Messaging dependency —
 * FCM requires a paid server component). All notifications are
 * scheduled locally using the browser's Notification API + timers.
 */

const STORAGE_KEY = 'notification_prefs';

// ─── Permission ────────────────────────────────────────────────────────

/**
 * Check if notifications are supported and permitted
 */
export function isSupported() {
  return 'Notification' in window;
}

export function getPermission() {
  if (!isSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Request notification permission from the user
 * @returns {Promise<string>} 'granted' | 'denied' | 'default'
 */
export async function requestPermission() {
  if (!isSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    // Safari older versions use callback style
    return new Promise((resolve) => {
      Notification.requestPermission((permission) => resolve(permission));
    });
  }
}

// ─── Preferences ────────────────────────────────────────────────────────

function getPrefs() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {
      dailyPuzzle: true,
      streakReminder: true,
      gameInvites: true,
      enabled: false, // starts disabled until user opts in
    };
  } catch {
    return { dailyPuzzle: true, streakReminder: true, gameInvites: true, enabled: false };
  }
}

function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function getNotificationPrefs() {
  return getPrefs();
}

export function updateNotificationPrefs(updates) {
  const prefs = { ...getPrefs(), ...updates };
  savePrefs(prefs);
  if (prefs.enabled) {
    scheduleDailyReminders();
  } else {
    cancelAllReminders();
  }
  return prefs;
}

// ─── Notification Sending ───────────────────────────────────────────────

/**
 * Show a browser notification
 */
export function showNotification(title, options = {}) {
  if (getPermission() !== 'granted') return null;

  const defaults = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: options.tag || 'chess-arena',
    renotify: false,
    requireInteraction: false,
  };

  try {
    const notification = new Notification(title, { ...defaults, ...options });

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);

    notification.onclick = () => {
      window.focus();
      if (options.onClick) options.onClick();
      notification.close();
    };

    return notification;
  } catch (e) {
    console.error('Notification error:', e);
    return null;
  }
}

// ─── Specific Notification Types ────────────────────────────────────────

export function notifyDailyPuzzle() {
  const prefs = getPrefs();
  if (!prefs.enabled || !prefs.dailyPuzzle) return;

  showNotification('🧩 Daily Puzzle Ready!', {
    body: 'A new chess puzzle is waiting for you. Keep your streak going!',
    tag: 'daily-puzzle',
    onClick: () => { window.location.hash = '#/puzzles'; },
  });
}

export function notifyStreakReminder(currentStreak) {
  const prefs = getPrefs();
  if (!prefs.enabled || !prefs.streakReminder) return;

  showNotification(`🔥 Don't break your ${currentStreak}-day streak!`, {
    body: 'Solve today\'s puzzle to keep your streak alive.',
    tag: 'streak-reminder',
    onClick: () => { window.location.hash = '#/puzzles'; },
  });
}

export function notifyGameInvite(fromPlayer) {
  const prefs = getPrefs();
  if (!prefs.enabled || !prefs.gameInvites) return;

  showNotification('⚔️ Game Challenge!', {
    body: `${fromPlayer} has challenged you to a game!`,
    tag: 'game-invite',
    requireInteraction: true,
    onClick: () => { window.location.hash = '#/multiplayer'; },
  });
}

export function notifyGameResult(result, opponent) {
  const emoji = result === 'win' ? '🏆' : result === 'draw' ? '🤝' : '📉';
  const text = result === 'win' ? 'You won!' : result === 'draw' ? 'Draw!' : 'You lost.';

  showNotification(`${emoji} Game Over — ${text}`, {
    body: `Your game against ${opponent} has ended.`,
    tag: 'game-result',
    onClick: () => { window.location.hash = '#/leaderboard'; },
  });
}

// ─── Scheduled Reminders ────────────────────────────────────────────────

let dailyTimer = null;
let streakTimer = null;

/**
 * Schedule daily puzzle reminder (checks every hour if puzzle hasn't been done)
 */
export function scheduleDailyReminders() {
  cancelAllReminders();
  const prefs = getPrefs();
  if (!prefs.enabled) return;

  // Check every 4 hours if user hasn't done their daily puzzle
  dailyTimer = setInterval(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastPuzzle = localStorage.getItem('daily_puzzle_date');
    if (lastPuzzle !== today && prefs.dailyPuzzle) {
      notifyDailyPuzzle();
    }
  }, 4 * 60 * 60 * 1000); // 4 hours

  // Check streak status every 6 hours
  streakTimer = setInterval(() => {
    if (!prefs.streakReminder) return;
    try {
      const streakData = localStorage.getItem('daily_streak');
      if (streakData) {
        const { current } = JSON.parse(streakData);
        const today = new Date().toISOString().split('T')[0];
        const lastPuzzle = localStorage.getItem('daily_puzzle_date');
        if (lastPuzzle !== today && current > 0) {
          notifyStreakReminder(current);
        }
      }
    } catch (_) { /* no-op */ }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

export function cancelAllReminders() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (streakTimer) { clearInterval(streakTimer); streakTimer = null; }
}

// Auto-start reminders if enabled
const prefs = getPrefs();
if (prefs.enabled && getPermission() === 'granted') {
  scheduleDailyReminders();
}
