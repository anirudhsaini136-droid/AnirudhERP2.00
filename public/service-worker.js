/* eslint-disable no-restricted-globals */
// Offline-friendly caching for CRA builds. Avoid cache-first for the app shell and
// JS chunks so deploys are picked up after logout / hard navigation.

const CACHE_NAME = "nexaerp-ui-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(["/", "/index.html", "/manifest.json"]);
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
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/api/")) return false;
  return true;
}

/** Prefer network so new builds load; fall back to cache when offline. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

/** Legacy cache-then-network for small static assets only (not HTML / main bundles). */
async function cacheThenNetwork(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (!shouldHandle(event.request)) return;

  const path = new URL(event.request.url).pathname;
  const isNavigate = event.request.mode === "navigate";
  const isShell =
    isNavigate ||
    path === "/" ||
    path === "/index.html" ||
    path === "/login" ||
    path.endsWith(".html") ||
    path.startsWith("/static/");

  if (isShell) {
    event.respondWith(networkFirst(event.request).catch(() => caches.match(event.request)));
  } else {
    event.respondWith(cacheThenNetwork(event.request).catch(() => caches.match(event.request)));
  }
});
