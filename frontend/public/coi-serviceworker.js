/*! coi-serviceworker v0.1.7 - Guido Zuidhof / nicasso, licensed under MIT */
/*
 * Cross-Origin Isolation + Offline Cache Service Worker
 * 
 * Primary headers come from render.yaml (COOP + COEP: credentialless).
 * This SW is a fallback for environments that don't serve the headers.
 * It also caches static assets for offline play.
 */

const CACHE_NAME = 'chess-arena-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

if (typeof window === 'undefined') {
  // ===== Service Worker context =====
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(OFFLINE_ASSETS).catch(() => {
          // Some assets may fail; that's OK during install
        });
      }).then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        );
      }).then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', function (event) {
    // Skip cross-origin cache-only requests (Chrome bug workaround)
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
      return;
    }

    const url = new URL(event.request.url);

    // For navigation requests (HTML pages): network-first, cache fallback
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.status === 0) return response;
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
            newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
            newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
            const modified = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: newHeaders,
            });
            // Cache the navigation response
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, modified.clone()));
            return modified;
          })
          .catch(() => caches.match('/index.html'))
      );
      return;
    }

    // Static assets (JS, CSS, images, WASM): cache-first
    const isStaticAsset = url.pathname.startsWith('/static/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.wasm') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.worker.js');

    if (isStaticAsset && url.origin === self.location.origin) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.status === 0) return response;
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
            newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
            newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
            const modified = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: newHeaders,
            });
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, modified.clone()));
            return modified;
          }).catch(() => cached); // fallback to any stale cache
        })
      );
      return;
    }

    // All other requests: network-first with COEP headers
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response.status === 0) return response;
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
        newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }).catch(function (e) {
        // Offline — try cache
        return caches.match(event.request);
      })
    );
  });
} else {
  // ===== Window context — register the service worker =====
  (function () {
    // Already cross-origin isolated (server headers working) → no SW needed
    if (window.crossOriginIsolated) {
      console.log('[COI] Already cross-origin isolated ✓');
      sessionStorage.removeItem('coi-reload');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[COI] Service workers not supported');
      return;
    }

    // If already controlled by a service worker, but not isolated, reload once
    if (navigator.serviceWorker.controller) {
      // Use sessionStorage to prevent infinite reload loops
      if (!sessionStorage.getItem('coi-reload')) {
        sessionStorage.setItem('coi-reload', '1');
        console.log('[COI] SW active but not isolated — reloading...');
        window.location.reload();
      } else {
        console.log('[COI] SW active, already reloaded — server COOP/COEP may be missing');
      }
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
