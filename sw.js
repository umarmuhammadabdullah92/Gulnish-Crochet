/* =========================================================
   Gulnish Crochet — service worker (cache cleanup)
   =========================================================
   This worker exists only to purge old caches and unregister
   itself. The site is served network-first so visitors always
   see the latest changes immediately; no persistent cache is
   kept on the device.
   ========================================================= */

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.registration.unregister();
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function () {});