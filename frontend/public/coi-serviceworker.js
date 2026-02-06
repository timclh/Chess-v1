/*! coi-serviceworker v0.1.7 - Guido Zuidhof / nicasso, licensed under MIT */
/*
 * Cross-Origin Isolation Service Worker
 * Adds COOP/COEP headers to enable SharedArrayBuffer
 * without requiring server-side header configuration.
 *
 * Source: https://github.com/nicasso/coi-serviceworker (MIT)
 */
if (typeof window === 'undefined') {
  // Service Worker context
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) =>
    event.waitUntil(self.clients.claim())
  );

  self.addEventListener('fetch', function (event) {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
      return;
    }

    event.respondWith(
      fetch(event.request).then(function (response) {
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
        console.error(e);
      })
    );
  });
} else {
  // Window context — register the service worker
  (async function () {
    if (window.crossOriginIsolated !== false) return;

    const registration = await navigator.serviceWorker.register(
      window.document.currentScript.src
    ).catch((e) =>
      console.error('COOP/COEP Service Worker failed to register:', e)
    );

    if (registration) {
      console.log('[COI] Service Worker registered, reloading for cross-origin isolation...');
      // Need a controlled reload to activate the SW
      if (!navigator.serviceWorker.controller) {
        // Wait for the SW to be ready and reload
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    }
  })();
}
