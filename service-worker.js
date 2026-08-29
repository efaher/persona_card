const SHELL_CACHE = 'persona-card-shell-v1.2.2';
const CARD_CACHE = 'persona-card-cards-v1.2';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/runtime-config.js',
  '/backend-router.js',
  '/script.js',
  '/offline-entitlement.js',
  '/offline-license-guard.js',
  '/vendor/socket.io.min.js',
  '/manifest.webmanifest',
  '/icons/persona-card-icon.svg',
  '/icons/persona-card-192.png',
  '/icons/persona-card-512.png',
  '/icons/personita-set-icon.svg',
  '/icons/therapy-sb-set-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('persona-card-') && ![SHELL_CACHE, CARD_CACHE, 'persona-card-license-v1'].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isCardImage(url) {
  return url.origin === self.location.origin
    && (url.pathname.startsWith('/images/personita/') || url.pathname.startsWith('/images/terapi_sb/'));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isCardImage(url)) {
    event.respondWith(
      caches.open(CARD_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});
