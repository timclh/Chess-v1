/**
 * Whether the analysis engine can (and should) be started on this device right now.
 *
 * It needs cross-origin isolation (shared memory for the WASM build), a network
 * connection to fetch it the first time, and is not started on a data saver or a
 * slow connection, where a download of this size is unwelcome.
 */
export function canRunEngine() {
  if (typeof window === 'undefined' || !window.crossOriginIsolated) return false;
  if (typeof navigator === 'undefined') return true;
  if (navigator.onLine === false) return false;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType || ''))) return false;
  return true;
}
