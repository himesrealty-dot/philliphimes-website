/* HomeSearchIQ service worker — deliberately minimal.
 *
 * Scope is "/" (it's served from the web root), but it ONLY intervenes for the
 * app shell and its own static assets. Every other request — marketing pages,
 * IDX pages, and unknown paths — passes through untouched, so Netlify's real-404
 * behavior (no SPA fallback, by design) is preserved.
 *
 * Bump CACHE when app shell assets change so clients pick up the new version.
 */
// Bump this on any app-shell change so the new worker clears the old cache.
const CACHE = 'hsiq-v2';
// Note: '/app' is deliberately NOT precached — it's always fetched network-first
// (see below) so the shell can never be served stale. These are static assets only.
const SHELL = [
  '/css/app.css',
  '/js/app.js',
  '/manifest.webmanifest',
  '/images/homesearchiq-icon.svg',
  '/images/hsiq-icon-192.png',
  '/images/hsiq-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {}) // a missing asset must not block install
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch IDX / cross-origin

  const isAppNav = req.mode === 'navigate' && url.pathname.startsWith('/app');
  const isShellAsset = SHELL.includes(url.pathname);

  if (isAppNav) {
    // Network-first, bypassing the HTTP cache so a returning visitor always gets
    // the latest shell; fall back to the last-cached copy only when offline.
    event.respondWith(
      fetch(new Request(req.url, { cache: 'reload' }))
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/app', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/app'))
    );
    return;
  }

  if (isShellAsset) {
    // Cache-first for the shell's own static assets.
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // Everything else: do not call respondWith -> browser default (preserves 404s).
});
