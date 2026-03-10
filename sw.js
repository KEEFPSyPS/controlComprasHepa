const CACHE_NAME = 'hepa-compras-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './img/Logo_HEPA.png',
  './img/iconoApp.png'
];

// 1. Instalación: Cachear solo lo esencial (App Shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando App Shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting()) // Forzar activación inmediata
  );
});

// 2. Activación: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Tomar control de los clientes inmediatamente
  );
});

// 3. Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. IGNORAR peticiones a Firebase, Google APIs y Extensiones
  // Firebase SDK maneja su propia persistencia offline. Interceptarlas causa errores.
  if (
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com')
  ) {
    return;
  }

  // B. Estrategia: Cache First, falling back to Network (con actualización dinámica)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
