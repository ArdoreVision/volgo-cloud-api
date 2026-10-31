// Minimale service worker: maakt Volgo installeerbaar als app.
// Bewaart niets in cache, zodat bezoekers altijd de nieuwste versie zien.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
