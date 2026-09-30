/* ============================================================
   sw.js — the installability service worker.

   Chrome's install criteria still require a registered worker
   with a fetch handler; this one is deliberately small: a
   network-first pass-through for the app shell, and NO
   interference in the ledger — /hub/ traffic (and every non-GET)
   goes straight to the network, uncached.

   Offline policy (spec: never a dead screen): a failed
   NAVIGATION is answered by the branded offline state
   (offline.html), carrying the page the player was bound for in
   ?from= — that page shows "Back online" and returns them there.
   A no-store request is a connectivity probe: never cached, and
   on failure never rescued — the offline page must be able to
   tell that the line is still down.                            */
/* ============================================================ */

const CACHE = '999-floor-v3';
const SHELL = [
  './',
  './index.html',
  './login-16x9.html',
  './table-16x9.html',
  './offline.html',
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
  const probe = e.request.cache === 'no-store';            /* a line check, not a page */
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (!probe) {
          const copy = res.clone();
          /* the offline page always lives under its bare key —
             one canonical copy, never a stale query twin      */
          const key = /\/offline\.html$/.test(url.pathname) ? './offline.html' : e.request;
          caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => {
        if (e.request.mode === 'navigate') {
          const isOfflinePage = /\/offline\.html$/.test(url.pathname);
          if (!isOfflinePage) {
            /* the branded offline state — hand it the page the
               player was bound for so "back online" can return
               them to exactly that                            */
            const dest = new URL('./offline.html', self.location.href);
            dest.searchParams.set('from', e.request.url);
            return Response.redirect(dest.href, 302);
          }
          /* the offline page itself: its ONE canonical cache
             entry (the query is ours, not the cache's)         */
          return caches.match('./offline.html')
            .then((m) => m || Response.error());
        }
        /* everything else: what we cached, or an honest failure —
           probes must fail loudly so the offline page waits      */
        return caches.match(e.request).then((m) => m || Response.error());
      })
  );
});
