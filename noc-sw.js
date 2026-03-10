/* ============================================================
   NURSE OWNERSHIP CIRCLE — sw.js
   Service Worker: Cache-first strategy for offline support
   tmacinspired.com
   ============================================================ */

const CACHE_NAME   = 'noc-v1';
const FONT_CACHE   = 'noc-fonts-v1';

/* Files to cache on install */
const PRECACHE_URLS = [
  './nurse-ownership-circle.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
];

/* Google Fonts origins to cache at runtime */
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

/* ----------------------------------------------------------
   INSTALL — Precache core app shell
   ---------------------------------------------------------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[NOC SW] Pre-caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[NOC SW] Pre-cache failed:', err))
  );
});

/* ----------------------------------------------------------
   ACTIVATE — Clean up old caches
   ---------------------------------------------------------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== FONT_CACHE)
          .map(name => {
            console.log('[NOC SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* ----------------------------------------------------------
   FETCH — Cache-first for app shell, runtime for fonts
   ---------------------------------------------------------- */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET requests */
  if (request.method !== 'GET') return;

  /* Skip chrome-extension and other non-http schemes */
  if (!url.protocol.startsWith('http')) return;

  /* Google Fonts — stale-while-revalidate */
  if (FONT_ORIGINS.some(origin => url.href.startsWith(origin))) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  /* App shell — cache-first, fall back to network */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        /* Only cache successful responses from our origin */
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          url.origin === self.location.origin
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        /* Offline fallback — return the main HTML for navigation */
        if (request.destination === 'document') {
          return caches.match('./nurse-ownership-circle.html');
        }
      });
    })
  );
});
