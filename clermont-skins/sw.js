// sw.js — Clermont Skins service worker. Offline-first app shell.
// Scope: /clermont-skins/. Stale-while-revalidate: serve from cache instantly,
// refresh in the background. The Firebase SDK is self-hosted and precached, so
// the app boots with no signal. Firestore traffic (IndexedDB + its own network)
// is never intercepted.

var CACHE = 'clermont-skins-v5';
var SHELL = [
  '/clermont-skins/',
  '/clermont-skins/index.html',
  '/clermont-skins/app.css',
  '/clermont-skins/manifest.webmanifest',
  '/clermont-skins/js/app.js',
  '/clermont-skins/js/ui.js',
  '/clermont-skins/js/store.js',
  '/clermont-skins/js/calc.js',
  '/clermont-skins/js/course.js',
  '/clermont-skins/js/access.js',
  '/clermont-skins/js/firebase.js',
  '/clermont-skins/js/firebase-config.js',
  '/clermont-skins/js/router.js',
  '/clermont-skins/vendor/firebase-app.js',
  '/clermont-skins/vendor/firebase-firestore.js',
  '/clermont-skins/js/pages/today.js',
  '/clermont-skins/js/pages/scores.js',
  '/clermont-skins/js/pages/scoreboard.js',
  '/clermont-skins/js/pages/skins.js',
  '/clermont-skins/js/pages/ctp.js',
  '/clermont-skins/js/pages/groups.js',
  '/clermont-skins/js/pages/payouts.js',
  '/clermont-skins/js/pages/owner.js',
  '/clermont-skins/js/pages/scorecard.js',
  '/clermont-skins/icons/icon.svg',
  '/clermont-skins/icons/favicon.png',
  '/clermont-skins/icons/icon-192.png',
  '/clermont-skins/icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL).catch(function () { /* ignore individual misses */ });
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Only manage our own scope; let Firebase/Google/other hosts pass through untouched.
  if (url.origin !== self.location.origin || url.pathname.indexOf('/clermont-skins/') !== 0) return;
  if (url.pathname.indexOf('/api/') === 0) return;

  // Stale-while-revalidate: cache-first, refresh in the background.
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () {
        // offline and not cached: fall back to the app shell for navigations
        return cached || caches.match('/clermont-skins/index.html');
      });
      return cached || network;
    })
  );
});
