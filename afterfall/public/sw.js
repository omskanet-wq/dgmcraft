// Afterfall service worker. Network-first for the entry HTML so the user
// always gets the latest build, cache-first for everything else.
const CACHE_NAME = 'afterfall-v1';
const PRECACHE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req)) ?? Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      // Refresh in the background.
      fetch(req).then((r) => caches.open(CACHE_NAME).then((c) => c.put(req, r))).catch(() => {});
      return cached;
    }
    try {
      const r = await fetch(req);
      caches.open(CACHE_NAME).then((c) => c.put(req, r.clone())).catch(() => {});
      return r;
    } catch {
      return Response.error();
    }
  })());
});
