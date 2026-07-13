'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Registers the hand-written Service Worker (public/sw.js).
 *
 * - Production only: on dev (LAN http / HMR) a SW just fights the dev server and caches
 *   stale chunks. Secure-context is also required, which Vercel Preview/Prod provide.
 * - `updateViaCache: 'none'` so the browser always revalidates sw.js itself (never serves
 *   a stale worker), letting a fixed / kill-switch SW roll out on the next visit.
 * - When a new worker finishes installing while one already controls the page, prompt the
 *   user to reload (spec §7: "偵測到新 SW 時提示使用者重整"), then hard-reload once the
 *   new worker takes control.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    let refreshing = false;

    const promptUpdate = (worker: ServiceWorker) => {
      toast('有新版本可用', {
        description: '重新整理以套用最新版本。',
        duration: Infinity,
        action: {
          label: '重新整理',
          onClick: () => worker.postMessage('SKIP_WAITING'),
        },
      });
    };

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });

        // A worker is already waiting (installed on a previous visit).
        if (reg.waiting && navigator.serviceWorker.controller) {
          promptUpdate(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              promptUpdate(installing);
            }
          });
        });
      } catch {
        // Registration failures must never surface to the user.
      }
    };

    // New worker took control after SKIP_WAITING -> reload once to get the fresh shell.
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    register();

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
    };
  }, []);

  return null;
}
