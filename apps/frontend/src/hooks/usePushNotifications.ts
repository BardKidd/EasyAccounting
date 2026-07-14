'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  subscribePush,
  unsubscribePush,
} from '@/services/pushNotification';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// VAPID 公鑰 base64url → Uint8Array，供 pushManager.subscribe 的 applicationServerKey（spec §6）。
// 明確以 ArrayBuffer 建構，讓型別為 Uint8Array<ArrayBuffer>（BufferSource 相容，避免 SharedArrayBuffer 歧義）。
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** 已以 standalone（加到主畫面）啟動。iOS 僅 standalone 才可用 Push。 */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true || window.matchMedia('(display-mode: standalone)').matches
  );
}

interface UsePushNotifications {
  supported: boolean; // 瀏覽器支援 serviceWorker + PushManager + Notification
  standalone: boolean; // 已加到主畫面（iOS Push 前提）
  configured: boolean; // 前端有設 NEXT_PUBLIC_VAPID_PUBLIC_KEY
  permission: NotificationPermission;
  subscribed: boolean;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/**
 * 驅動 Web Push 訂閱開關（spec §6）。
 * enable() 必須由使用者手勢觸發（iOS 要求），內部請求權限 → pushManager.subscribe → 上報後端。
 */
export function usePushNotifications(): UsePushNotifications {
  const [supported, setSupported] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const configured = !!VAPID_PUBLIC_KEY;

  useEffect(() => {
    const sup =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setSupported(sup);
    setStandalone(detectStandalone());
    if (!sup) return;

    setPermission(Notification.permission);
    // 反映實際訂閱狀態（可能上次已訂閱）。
    navigator.serviceWorker
      .getRegistration()
      .then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        setSubscribed(!!sub);
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    if (!supported || !configured) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error('未取得通知權限，請至系統設定開啟');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      });

      const json = sub.toJSON();
      await subscribePush({
        endpoint: json.endpoint as string,
        expirationTime: json.expirationTime ?? null,
        keys: {
          p256dh: (json.keys as Record<string, string>).p256dh,
          auth: (json.keys as Record<string, string>).auth,
        },
      });
      setSubscribed(true);
      toast.success('已開啟推播通知');
    } catch (error) {
      console.error('[Push] enable failed', error);
      toast.error('開啟推播失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }, [supported, configured]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
      toast.success('已關閉推播通知');
    } catch (error) {
      console.error('[Push] disable failed', error);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    standalone,
    configured,
    permission,
    subscribed,
    busy,
    enable,
    disable,
  };
}
