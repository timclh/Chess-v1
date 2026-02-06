/*! coi-serviceworker v0.1.7 - Guido Zuidhof / nicasso, licensed under MIT */
/*
 * Cross-Origin Isolation Service Worker (safety net)
 * 
 * Primary headers come from render.yaml (COOP + COEP: credentialless).
 * This SW is a fallback for environments that don't serve the headers.
 * It intercepts responses and adds the needed headers.
 */
if (typeof window === 'undefined') {
  // ===== Service Worker context =====
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) =>
    event.waitUntil(self.clients.claim())
  );

  self.addEventListener('fetch', function (event) {
    // Skip cross-origin cache-only requests (Chrome bug workaround)
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
      return;
    }

    event.respondWith(
      fetch(event.request).then(function (response) {
        // Opaque responses cannot be modified
        if (response.status === 0) {
          return response;
        }

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }).catch(function (e) {
        console.error('[COI-SW] fetch error:', e);
      })
    );
  });
} else {
  // ===== Window context — register the service worker =====
  (function () {
    // Already cross-origin isolated (server headers working) → no SW needed
    if (window.crossOriginIsolated) {
      console.log('[COI] Already cross-origin isolated via server headers ✓');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[COI] Service workers not supported');
      return;
    }

    // If already controlled by a service worker, reload once to pick up headers
    if (navigator.serviceWorker.controller) {
      console.log('[COI] SW active but not isolated — may need hard refresh');
      return;
    }

    // Register the SW
    navigator.serviceWorker.register(window.document.currentScript.src).then(
      function (reg) {
        console.log('[COI] Service Worker registered, waiting for activation...');
        
        // Listen for the new controller to take over, then reload
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!window.crossOriginIsolated) {
            console.log('[COI] Controller changed, reloading for cross-origin isolation...');
            window.location.reload();
          }
        });

        // If skipWaiting already fired, force reload
        if (reg.active && !navigator.serviceWorker.controller) {
          console.log('[COI] SW active but no controller yet, reloading...');
          window.location.reload();
        }
      },
      function (err) {
        console.error('[COI] Service Worker registration failed:', err);
      }
    );
  })();
}
