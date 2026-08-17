/*
 * Door to Door service worker.
 *
 * Why this exists: a traveler standing in Gyeongju with no data should still be
 * able to open the plan they already made. This is the offline promise the SAVE
 * tab makes — without an app store, without a download, without a native build.
 *
 * Deliberately conservative:
 *  - Never caches map tiles or any third-party origin (tile policy + storage).
 *  - Never caches anything that looks like a booking, ticket or document API.
 *  - Serves stale app shell only as a fallback, so a connected user always sees
 *    the current build.
 */

const VERSION = "dtd-v1";
const SHELL = `${VERSION}-shell`;

// The shell only. Trip data is not persisted here — see the privacy note below.
const SHELL_URLS = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only. Map tiles, deep links and any partner domain go straight
  // to the network and are never stored by us.
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so a connected user always gets the live build,
  // cached shell only when the network fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Static build assets: cache first, they are content-hashed.
  if (/\.(?:js|css|woff2?|png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

/*
 * Privacy note: no itinerary, address, passport or booking data is written to
 * this cache. Anything personal stays in the page's own storage under the
 * user's control, so uninstalling the app removes it with the origin.
 */
