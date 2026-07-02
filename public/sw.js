// Proje Takip — hafif service worker (kurulabilirlik + temel çevrimdışı kabuk)
// Not: Veri tarayıcıda (localStorage) yaşar; SW yalnızca statik varlıkları ve
// sayfa kabuğunu önbelleğe alır — kullanıcı verisine dokunmaz.
const CACHE = "ptakip-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Next.js içerik-hash'li statik varlıklar → cache-first (güvenli, değişmez)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // Sayfa gezinmeleri → network-first, çevrimdışıysa önbellekten kabuk
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, res.clone());
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = (await cache.match(request)) || (await cache.match("/"));
          return cached || Response.error();
        }
      })()
    );
  }
});
