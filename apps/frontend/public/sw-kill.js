/*
 * EasyAccounting Service Worker KILL-SWITCH (spec §7)
 *
 * Emergency use only. If a bad SW ships and bricks returning users with stale caches
 * (white screen after deploy), replace the deployed /sw.js CONTENT with this file's
 * content (keep the /sw.js path so already-registered clients pick it up on their next
 * update check), OR point ServiceWorkerRegister at '/sw-kill.js'. It unregisters itself
 * and deletes all app caches, restoring plain network behavior on the next load.
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('easyacct-')).map((n) => caches.delete(n)),
      );
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});

// Pass every request straight through — do not intercept anything.
self.addEventListener('fetch', () => {});
