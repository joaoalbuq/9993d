/* ============================================================
   sw.js — the installability service worker.

   Chrome's install criteria still require a registered worker
   with a fetch handler; this one is deliberately small: a
   network-first pass-through for the app shell with an offline
   fallback, and NO interference in the ledger — /hub/ traffic
   (and every non-GET) goes straight to the network, uncached.
   ============================================================ */

const CACHE = '999-floor-v1';
const SHELL = [
  './',
  './index.html',
  './login-16x9.html',
  './table-16x9.html',
  './manifest.webmanifest',
  './media/icon-180.png',
  './media/icon-192.png',
  './media/icon-512.png',
  './media/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;                 /* ledger writes: never ours */
  if (url.origin !== self.location.origin) return;        /* cross-origin: never ours */
  if (url.pathname.startsWith('/hub/')) return;           /* the hub answers for itself */
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('./table-16x9.html')))
  );
});
