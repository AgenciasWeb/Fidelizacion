/* Service worker de la app "Menús de la zona" (scope propio: menus/).
   Permite instalarla como app y guardar el armazón para abrirla rápido. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  /* Solo cacheamos el armazón propio de esta app (HTML/manifest). */
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin || !u.pathname.includes('/menus/')) return;
  e.respondWith(
    fetch(req).then(r => {
      try { const c = r.clone(); caches.open('menus-v1').then(cache => cache.put(req, c)); } catch (_) {}
      return r;
    }).catch(() => caches.match(req))
  );
});
