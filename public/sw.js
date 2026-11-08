// Service worker: makes Volgo installable as an app and shows push notifications.
// Caches nothing, so everyone always sees the newest version.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { titel: "Volgo", tekst: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.titel || "Volgo", {
      body: d.tekst || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: d.link || "/dashboard" },
      tag: d.link || "volgo",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = new URL((e.notification.data && e.notification.data.link) || "/dashboard", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lijst) => {
      for (const c of lijst) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          c.navigate(link).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
