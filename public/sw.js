// CoachFlow service worker: кэш статики и офлайн-страница.
// Данные (страницы, действия) всегда запрашиваются из сети — офлайн показываем заглушку.
const CACHE = "coachflow-v7";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon.svg", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Неизменяемая статика Next.js и иконки: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

// ---------------------------------------------------------------- push-уведомления
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "CoachFlow", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "CoachFlow";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag ? `${data.tag}:${data.url || ""}` : undefined,
    renotify: true,
    data: { url: data.url || "/", sessionId: data.sessionId || null },
    // кнопки «Приду» / «Не смогу» (Android и компьютер; iPhone кнопки не показывает)
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : undefined,
    requireInteraction: Array.isArray(data.actions) && data.actions.length > 0,
  };
  const tasks = [self.registration.showNotification(title, options)];
  // Счётчик на иконке приложения (iOS 16.4+, Android, десктоп)
  if (typeof data.badge === "number" && self.navigator && "setAppBadge" in self.navigator) {
    tasks.push(self.navigator.setAppBadge(data.badge).catch(() => {}));
  }
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  // «Приду» — подтверждаем, не открывая приложение
  if (event.action === "confirm" && data.sessionId) {
    event.waitUntil(
      fetch("/api/attendance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId }),
      })
        .then((r) =>
          self.registration.showNotification(r.ok ? "Отлично, ждём вас!" : "Не получилось подтвердить", {
            body: r.ok ? "Тренер увидит, что вы придёте." : "Откройте приложение и нажмите «Приду».",
            icon: "/icons/icon-192.png",
            data: { url: data.url || "/" },
          }),
        )
        .catch(() => self.clients.openWindow(data.url || "/")),
    );
    return;
  }
  const target = event.action === "decline" && data.sessionId ? `/client/sessions/${data.sessionId}/confirm?answer=decline` : data.url || "/";
  const url = new URL(target, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          return w.navigate ? w.navigate(url).then((nw) => (nw || w).focus()) : w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
