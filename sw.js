// TELEMAX service worker: sahifa va kutubxonalarni saqlab, internetsiz ochishga yordam beradi.
// Chat ma'lumotlari (Firebase) to'g'ridan-to'g'ri internetdan olinadi.
var CACHE = "telemax-v3";

var SHELL = [
  "./",
  "./index.html",
  "./media.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

var CDN = [
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

var CDN_HOSTS = ["www.gstatic.com", "cdnjs.cloudflare.com", "res.cloudinary.com"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      var shellJobs = SHELL.map(function (url) {
        return cache.add(url).catch(function () {});
      });

      var cdnJobs = CDN.map(function (url) {
        return fetch(url, { mode: "no-cors" }).then(function (res) {
          return cache.put(url, res);
        }).catch(function () {});
      });

      return Promise.all(shellJobs.concat(cdnJobs));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  // Video, audio va bo'laklab yuklanadigan so'rovlarga tegmaymiz
  if (req.headers.has("range") || req.destination === "video" || req.destination === "audio") return;

  var url = new URL(req.url);

  // Kutubxonalar va rasmlar: avval saqlangan nusxadan
  if (CDN_HOSTS.indexOf(url.hostname) !== -1) {
    if (url.hostname === "res.cloudinary.com" && req.destination !== "image") return;

    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;

        return fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
          return res;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Sayt fayllari: avval internetdan, bo'lmasa saqlangan nusxadan
  event.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
