// Tether service worker (spec section 13). The build (vite.config.ts) fills in VERSION and FILES: every emitted file.
// Everything is cached at install; a page asks "status" to learn whether every entry is really stored.
const CACHE = "tether-__VERSION__";
const FILES = __FILES__;

// Module scripts are requested with an Origin header, so a server's Vary: Origin must not hide a stored entry.
const VARY = { ignoreVary: true };
const store = async () => {
  const cache = await caches.open(CACHE);
  const missing = [];
  for (const url of FILES) if (!(await cache.match(url, VARY))) missing.push(url);
  return { cache, missing };
};

// A failed entry never fails the install; it stays missing, so "status" reports it and "fill" retries it.
async function fill() {
  const { cache, missing } = await store();
  await Promise.allSettled(
    missing.map(async (url) => {
      const res = await fetch(url, { cache: "reload" });
      if (!res.ok) throw new Error(url);
      await cache.put(url, res);
    }),
  );
}

self.addEventListener("install", (e) => e.waitUntil(fill()));

self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("tether-") && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("message", (e) => {
  const { type } = e.data ?? {};
  // An update waits until the page asks (Home's "Update ready"), never mid-question.
  if (type === "skipWaiting") return void self.skipWaiting();
  const reply = (m) => e.ports[0]?.postMessage({ missing: m.length, total: FILES.length });
  if (type === "status") e.waitUntil(store().then((s) => reply(s.missing)));
  if (type === "fill") e.waitUntil(fill().then(store).then((s) => reply(s.missing)));
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);
  // Only same-origin GETs: the optional AI help request and anything cross-origin stay network-only.
  if (request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request.mode === "navigate" ? "/index.html" : request, VARY);
      return hit ?? fetch(request);
    })(),
  );
});
