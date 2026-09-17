import { NextResponse } from "next/server";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

const mobilePath = `${basePath}/mobile`;
const cacheName = "scheduly-mobile-v1";

const serviceWorker = `
const CACHE_NAME = ${JSON.stringify(cacheName)};
const MOBILE_PATH = ${JSON.stringify(mobilePath)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(MOBILE_PATH))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("scheduly-mobile-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    !url.pathname.startsWith(MOBILE_PATH)
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(MOBILE_PATH, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(MOBILE_PATH);
        return cached || Response.error();
      }),
  );
});
`;

export function GET() {
  return new NextResponse(serviceWorker, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": mobilePath,
    },
  });
}
