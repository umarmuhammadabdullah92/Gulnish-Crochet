var CACHE_NAME = "gulnish-cache-v24";
var APP_SHELL = [
  "./",
  "index",
  "products",
  "about",
  "contact",
  "checkout",
  "cart",
  "track",
  "privacy",
  "refund",
  "terms",
  "css/fonts.css?v=24",
  "css/style.css?v=24",
  "css/admin.css?v=24",
  "manifest.webmanifest",
  "js/config.js?v=24",
  "js/supabase.js?v=24",
  "js/script.js?v=24",
  "js/cart.js?v=24",
  "js/track.js?v=24",
  "images/logo/logo-badge.png",
  "images/favicon.ico",
  "images/favicon.png",
  "images/purses/purse-1.webp",
  "images/bags/bag-1.webp"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  if (request.url.indexOf("supabase") !== -1 ||
      request.url.indexOf("fonts.gstatic") !== -1 ||
      request.url.indexOf("fonts.googleapis") !== -1) {
    return;
  }

  // Pages are network-first so visitors always get the latest version;
  // the cache is only used when the network is unavailable (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (c) {
          return c || caches.match("./");
        });
      })
    );
    return;
  }

  // Code and fonts are network-first so every visitor always sees the latest design.
  if (request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "font" ||
      request.destination === "manifest") {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (c) {
          return c || caches.match("./");
        });
      })
    );
    return;
  }

  // Images and other static assets are cache-first for speed,
  // falling back to the network.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match("./");
      });
    })
  );
});