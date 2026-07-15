'use client';

import { useEffect, useState } from 'react';

const SNOOZE_KEY = 'pwa-install-dismissed-at';
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24h (spec §5)

/** iOS incl. iPadOS 13+ (which reports a desktop "Macintosh" UA). */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
  return (
    (iOSDevice || iPadOS) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

/** Already launched as an installed PWA (standalone). */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true || window.matchMedia('(display-mode: standalone)').matches
  );
}

function isSnoozed(): boolean {
  try {
    const at = localStorage.getItem(SNOOZE_KEY);
    if (!at) return false;
    return Date.now() - Number(at) < SNOOZE_MS;
  } catch {
    return false;
  }
}

interface UsePWAInstall {
  /** True only on iOS Safari, not yet installed, not snoozed. */
  shouldPrompt: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  /** Snooze the prompt for 24h and hide it. */
  dismiss: () => void;
}

/**
 * Drives the iOS "Add to Home Screen" guide. iOS Safari never fires
 * `beforeinstallprompt`, so we detect the platform and prompt manually (spec §5).
 * Returns `shouldPrompt=false` during SSR / first paint to avoid hydration flicker;
 * detection runs in an effect after mount.
 */
export function usePWAInstall(): UsePWAInstall {
  const [state, setState] = useState({
    shouldPrompt: false,
    isIOS: false,
    isStandalone: false,
  });

  useEffect(() => {
    const ios = isIOS();
    const standalone = isStandalone();
    setState({
      isIOS: ios,
      isStandalone: standalone,
      shouldPrompt: ios && !standalone && !isSnoozed(),
    });
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      // ignore private-mode storage errors
    }
    setState((s) => ({ ...s, shouldPrompt: false }));
  };

  return { ...state, dismiss };
}
