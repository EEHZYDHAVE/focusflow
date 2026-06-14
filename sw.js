// ─── INCREMENT THIS NUMBER every time you upload a new version ───
const VERSION = 13;
// ─────────────────────────────────────────────────────────────────

const CACHE = `focusflow-v${VERSION}`;
const ASSETS = [
  './focusflow_mobile.html',
  './focusflow.html',    // new desktop version
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
];

// Install — cache all assets, activate immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())  // take over immediately
  );
});

// Activate — remove old caches, claim all clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => {
      self.skipWaiting();          // force takeover even if old SW is running
      return self.clients.claim(); // control all open tabs immediately
    })
  );
});

// Fetch strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network-first for external APIs — never cache these
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname === 'api.github.com' ||
    url.hostname === 'generativelanguage.googleapis.com'
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for local app assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return the main app shell
        if (e.request.destination === 'document') {
          return caches.match('./focusflow_mobile.html');
        }
      });
    })
  );
});
