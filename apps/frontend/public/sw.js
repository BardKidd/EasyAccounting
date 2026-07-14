/*
 * EasyAccounting Service Worker (hand-written, minimal, safe-by-default)
 * Spec: docs/specs/active/pwa-mobile-support/spec.md §4 & §7
 *
 * Contract (do NOT loosen without re-reading §7 — SW is sticky and can brick returning users):
 *  - Version the caches. On `activate`, purge every cache that isn't the current version.
 *  - Precache ONLY: /offline (HTML fallback), manifest, icons. Never authed pages.
 *  - /api/*  -> network-only, never cached (httpOnly-cookie auth + cross-user isolation).
 *  - Navigations (mode === 'navigate') -> network-first, fall back to precached /offline.
 *    The document response itself is NEVER written to cache (so no authed HTML leaks to
 *    the next user of a shared device).
 *  - Static assets (/_next/static/* are content-hashed & immutable, plus our icons/splash)
 *    -> cache-first into a versioned runtime cache.
 *  - skipWaiting + clients.claim so a fixed SW takes over fast; the page prompts a reload.
 *
 * BUMP `SW_VERSION` on every deploy that changes what gets precached / cached behavior.
 * Content-hashed /_next/static URLs are immutable, so cache-first on them is always correct;
 * the version bump exists to drop the old precache (notably a stale /offline) on activate.
 */

const SW_VERSION = 'v2';
const PRECACHE = `easyacct-precache-${SW_VERSION}`;
const RUNTIME = `easyacct-runtime-${SW_VERSION}`;
const OFFLINE_URL = '/offline';

// Kept small & stable: things we can name at author time.
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Ignore individual failures (e.g. an icon 404 in dev) so install never wedges.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PRECACHE, RUNTIME]);
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('easyacct-') && !keep.has(n))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

// Let the page trigger an immediate takeover after it detects an update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isStaticAsset(url) {
  // Enumerated safe namespaces ONLY (spec §7 defense-in-depth): the SW's "never cache
  // authed/user data" guarantee must hold from the code itself, not from the assumption
  // that all user data happens to be cross-origin. A generic ".js/.png/…" extension match
  // would cache-first any same-origin resource with that extension; we deliberately don't.
  const p = url.pathname;
  return (
    p.startsWith('/_next/static/') || // content-hashed, immutable build output
    p.startsWith('/_next/image') || // next/image optimizer output
    p.startsWith('/icons/') ||
    p.startsWith('/splash/') ||
    p === '/apple-touch-icon.png' ||
    p === '/manifest.json'
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    // Only store successful, basic (same-origin) responses.
    if (res && res.ok && res.type === 'basic') {
      const cache = await caches.open(RUNTIME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    // No cache, no network -> let it fail (asset-level).
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Non-GET (mutations, form posts) -> straight to network, never cached.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin (analytics, fonts CDN, etc.) -> untouched.
  if (url.origin !== self.location.origin) return;

  // API is network-only, forever. Never cache authed/user data.
  if (url.pathname.startsWith('/api/')) return;

  // Full-page navigations: network-first, /offline fallback. Never cache the doc.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch (err) {
          const offline = await caches.match(OFFLINE_URL, { cacheName: PRECACHE });
          return (
            offline ||
            new Response('離線中', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // Immutable / static assets: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (e.g. ?_rsc= data fetches): network-only, no caching.
});

// -----------------------------------------------------------------------------
// Web Push (spec §6). iOS 16.4+ delivers push only to home-screen (standalone) PWAs.
// Payload shape (from backend webPushService): { title, body, url?, tag? }.
// -----------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'EasyAccounting';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag, // same tag collapses/replaces, avoids notification spam
    data: { url: data.url || '/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Reuse an already-open app window if there is one; else open a new one.
      for (const client of clientsArr) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(target);
            } catch (err) {
              /* cross-origin or detached — ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});
