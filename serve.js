/* ============================================================
   serve.js — the 3dfullscreen preview host, with the hub on OUR origin.
   node 3dfullscreen/serve.js  →  http://127.0.0.1:8787/

   Serves the two pages and PROXIES every /hub/* call to the dev hub, so
   the pages fetch their own origin and the browser never enters CORS at
   all — no preflight, no Access-Control-* needed on any answer.

   HUB_UPSTREAM=http://localhost:8899/hub   where the hub lives
   PORT=8787                                where this host listens
   ============================================================ */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HERE = __dirname;
const PORT = Number(process.env.PORT) || 8787;
const UPSTREAM = new URL(process.env.HUB_UPSTREAM || 'http://localhost:8899/hub');

/* the pages, and only the pages — an allowlist, so no path ever escapes */
const PAGES = {
  '/': 'login-16x9.html',
  '/index.html': 'index.html',
  '/login-16x9.html': 'login-16x9.html',
  '/table-16x9.html': 'table-16x9.html',
  '/offline.html': 'offline.html'
};

/* the PWA shell — same allowlist rule, binary-safe */
const ASSETS = {
  '/luck999.js': ['luck999.js', 'text/javascript; charset=utf-8'],
  '/shoe999.js': ['shoe999.js', 'text/javascript; charset=utf-8'],
  '/ev999.js': ['ev999.js', 'text/javascript; charset=utf-8'],
  '/index999.js': ['index999.js', 'text/javascript; charset=utf-8'],
  '/room999.js': ['room999.js', 'text/javascript; charset=utf-8'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json; charset=utf-8'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'],
  '/media/icon-180.png': ['media/icon-180.png', 'image/png'],
  '/media/icon-192.png': ['media/icon-192.png', 'image/png'],
  '/media/icon-512.png': ['media/icon-512.png', 'image/png'],
  '/media/icon-512-maskable.png': ['media/icon-512-maskable.png', 'image/png']
};

/* hop-by-hop headers belong to the transport, not the proxy. The
   access-control-* family is dropped on purpose: these calls are
   same-origin, so CORS is not part of the conversation. */
const HOP = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'te', 'trailer',
  'proxy-authenticate', 'proxy-authorization', 'proxy-connection'
]);

function proxyHub(req, res) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase();
    if (HOP.has(lk)) continue;
    if (lk === 'host' || lk === 'origin' || lk === 'referer' || lk === 'accept-encoding') continue;
    headers[k] = v;
  }
  const up = http.request({
    hostname: UPSTREAM.hostname,
    port: UPSTREAM.port || 80,
    method: req.method,
    path: req.url,                       /* /hub/... verbatim, query included */
    headers
  }, (r) => {
    const out = {};
    for (const [k, v] of Object.entries(r.headers)) {
      const lk = k.toLowerCase();
      if (HOP.has(lk) || lk.startsWith('access-control-') || lk === 'vary') continue;
      out[k] = v;
    }
    res.writeHead(r.statusCode, out);
    /* a dropped upstream stream must not stall the client */
    r.on('error', () => res.end());
    r.pipe(res);
  });
  up.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'hub unreachable: ' + UPSTREAM.origin }));
  });
  req.pipe(up);
}

http.createServer((req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (p === '/hub' || p.startsWith('/hub/')) return proxyHub(req, res);
  const page = PAGES[p];
  if (page) {
    fs.readFile(path.join(HERE, page), 'utf8', (e, html) => {
      if (e) { res.writeHead(500, { 'content-type': 'text/plain' }); return res.end('read error'); }
      /* declare the same-origin hub route to the page: it reads
         window.__HUB_BASE__ and never has to cross an origin */
      html = html.replace(/<head[^>]*>/i, (m) => m + '<script>window.__HUB_BASE__=location.origin+"/hub";</script>');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(html);
    });
    return;
  }
  const asset = ASSETS[p];
  if (asset) {
    fs.readFile(path.join(HERE, asset[0]), (e, buf) => {
      if (e) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
      res.writeHead(200, { 'content-type': asset[1], 'cache-control': 'no-cache' });
      res.end(buf);
    });
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
}).listen(PORT, () => {
  console.log('3dfullscreen + hub on one origin → http://127.0.0.1:' + PORT + '/  (proxy → ' + UPSTREAM.origin + ')');
});
