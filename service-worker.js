const CACHE_NAME = "roster-cache-v3";
const OFFLINE_URL = "./offline.html"; // Optional fallback page

// Assets to pre-cache
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  OFFLINE_URL
];

// Install – cache static assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate – remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch – stale-while-revalidate + offline fallback
self.addEventListener("fetch", event => {
  const request = event.request;

  // API requests (e.g., to Render backend)
  if (request.url.includes("/timetable") || request.url.includes("/contacts")) {
    event.respondWith(
      fetchWithTimeout(request, 8000) // try live API, fallback to cache
        .catch(() => caches.match(request))
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static files: stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cached || caches.match(OFFLINE_URL));

      return cached || fetchPromise;
    })
  );
});

// Timeout helper – avoid PWA stuck on loading
function fetchWithTimeout(request, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Fetch timeout")), timeout);
    fetch(request).then(
      response => {
        clearTimeout(timer);
        resolve(response);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
