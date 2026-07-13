'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Retry control for the offline page. Progressive enhancement: if the SW-served page
 * hydrates, clicking checks connectivity first (spec Edge Case 1) — reloading while still
 * offline just re-serves /offline with no feedback, so instead we surface "仍處於離線狀態".
 * When back online, a normal reload returns to the app.
 */
export function OfflineRetryButton() {
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);

  const retry = () => {
    setChecking(true);
    setStillOffline(false);
    // Give the spinner a moment so the click always feels responsive.
    setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setChecking(false);
        setStillOffline(true);
        return;
      }
      window.location.reload();
    }, 600);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={retry}
        disabled={checking}
        className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.03] hover:shadow-emerald-500/40 active:scale-100 disabled:opacity-80"
      >
        <RefreshCw
          className={`h-5 w-5 ${checking ? 'animate-spin' : 'transition-transform group-hover:rotate-90'}`}
          strokeWidth={2.25}
        />
        {checking ? '重新連線中…' : '重新整理'}
      </button>
      <p
        aria-live="polite"
        className={`text-sm font-medium text-rose-500 transition-opacity duration-300 ${
          stillOffline ? 'opacity-100' : 'opacity-0'
        }`}
      >
        仍處於離線狀態，請檢查網路後再試。
      </p>
    </div>
  );
}
