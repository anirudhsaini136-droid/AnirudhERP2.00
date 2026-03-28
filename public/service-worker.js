/* eslint-disable no-restricted-globals */
// Lightweight offline support for CRA build (MVP).
// Caches GET requests to same-origin URLs so the UI can load offline after first visit.

const CACHE_NAME = "nexaerp-ui-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache shell basics; other assets will be cached on-demand.
      await cache.addAll(["/", "/index.html", "/manifest.json"]);
      // Best-effort: don't fail install if some assets are missing.
    })().catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })()
  );
  self.clients.claim();
});

function shouldHandle(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return false;
  // Don't cache API responses.
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/api/")) return false;
  return true;
}

async function cacheThenNetwork(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    // Clone because response body can be consumed only once.
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (!shouldHandle(event.request)) return;
  event.respondWith(cacheThenNetwork(event.request).catch(() => caches.match(event.request)));
});

