/**
 * Capacitor Native Service
 * 
 * Wraps Capacitor plugin APIs for iOS/Android native features.
 * Falls back gracefully on web — all methods are safe to call
 * regardless of platform.
 */

let Haptics = null;
let StatusBar = null;
let SplashScreen = null;
let Keyboard = null;
let Capacitor = null;

// Lazy-load Capacitor modules (only available in native app)
const init = (() => {
  let promise = null;
  return () => {
    if (promise) return promise;
    promise = (async () => {
      try {
        const cap = await import('@capacitor/core');
        Capacitor = cap.Capacitor;
        if (!Capacitor.isNativePlatform()) return;

        const [hap, sb, ss, kb] = await Promise.all([
          import('@capacitor/haptics'),
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
          import('@capacitor/keyboard'),
        ]);
        Haptics = hap.Haptics;
        StatusBar = sb.StatusBar;
        SplashScreen = ss.SplashScreen;
        Keyboard = kb.Keyboard;
      } catch (e) {
        // Not in a Capacitor context — swallow
      }
    })();
    return promise;
  };
})();

// ─── Public API ─────────────────────────────────────────────────────────

export function isNative() {
  return Capacitor?.isNativePlatform() ?? false;
}

export function getPlatform() {
  return Capacitor?.getPlatform() ?? 'web';
}

/** Light tap feedback (piece selection / button press) */
export async function hapticTap() {
  await init();
  if (Haptics) {
    try {
      await Haptics.impact({ style: 'light' });
    } catch (_) { /* no-op */ }
  }
}

/** Medium impact (move confirmation / capture) */
export async function hapticImpact() {
  await init();
  if (Haptics) {
    try {
      await Haptics.impact({ style: 'medium' });
    } catch (_) { /* no-op */ }
  }
}

/** Strong notification (game over / checkmate) */
export async function hapticNotification(type = 'success') {
  await init();
  if (Haptics) {
    try {
      await Haptics.notification({ type });
    } catch (_) { /* no-op */ }
  }
}

/** Hide the native splash screen (call after first render) */
export async function hideSplash() {
  await init();
  if (SplashScreen) {
    try {
      await SplashScreen.hide();
    } catch (_) { /* no-op */ }
  }
}

/** Set status bar style for native app */
export async function setStatusBarDark() {
  await init();
  if (StatusBar) {
    try {
      await StatusBar.setStyle({ style: 'dark' });
      await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
    } catch (_) { /* no-op */ }
  }
}

/** Get safe area insets for iOS notch handling */
export function getSafeAreaInsets() {
  // CSS env() is preferred, but this gives programmatic access
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
  };
}

// Auto-init on import
init();
