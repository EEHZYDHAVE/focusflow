// ─── INCREMENT THIS NUMBER every time you upload a new version ───
const VERSION = 2;
// ─────────────────────────────────────────────────────────────────

const CACHE = `focusflow-v${VERSION}`;
const ASSETS = [
  './focusflow_mobile.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache core assets; font may fail offline, that's okay
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for local assets, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network-first for the Anthropic API (AI review calls)
  if (url.hostname === 'api.anthropic.com') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses
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
