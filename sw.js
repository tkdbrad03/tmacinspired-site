// sw.js — Fast & Still Service Worker
var CACHE = 'fast-still-v1';
var ASSETS = ['/fast'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) {
        return k !== CACHE;
      }).map(function(k) {
        return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Network first for API calls (keeps sync live)
  if (e.request.url.indexOf('script.google.com') > -1) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' }});
    }));
    return;
  }
  // Cache first for the app shell
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});
