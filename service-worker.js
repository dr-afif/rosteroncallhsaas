const CACHE_NAME = "roster-cache-v3";
const urlsToCache = [
  "./",
  "./index.html",
  "./script.js",
  "./style.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (url.origin === location.origin) {
    // Cache-first strategy for local assets
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      }).catch(() => {
        return caches.match('./index.html'); // fallback
      })
    );
  } else {
    // Network-first for external APIs (Render backend)
    event.respondWith(
      fetch(event.request).catch(() => {
        // API unreachable — app should fall back to cached localStorage
        return new Response(JSON.stringify({ values: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});
