// Service worker for زَادُ المُسْلِم — offline app shell only.
// Dynamic content (prayer times, reciters, live search) always goes to the
// network; only the static shell and previously-viewed pages are cached,
// per the brief's instruction not to pretend dynamic API content is offline.

const CACHE_NAME = "zad-almuslim-shell-v2";
const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/art/quran.png",
  "/art/radio.png",
  "/art/tawashih.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept cross-origin (audio CDNs, live APIs) or /api routes —
  // those must always hit the network to stay accurate.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigations: network-first, fall back to cache, then offline shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/offline")))
    );
    return;
  }

  // Static assets (_next/static, icons, fonts): cache-first.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/art/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
