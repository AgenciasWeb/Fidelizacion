/* Service worker de la app "Panel de sellos" (scope propio: panel/).
   Chrome de computadora exige un service worker para ofrecer instalar la app,
   así que cada app tiene el suyo. Guarda el armazón para abrirla rápido. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin || !u.pathname.includes('/panel/')) return;
  e.respondWith(
    fetch(req).then(r => {
      try { const c = r.clone(); caches.open('panel-v1').then(cache => cache.put(req, c)); } catch (_) {}
      return r;
    }).catch(() => caches.match(req))
  );
});
