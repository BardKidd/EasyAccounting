import { unsubscribePush } from '@/services/pushNotification';

/**
 * 登出 / 共用裝置清理（spec Edge Cases 4）：取消 Push 訂閱、通知後端刪除、清 SW caches。
 * 全程 best-effort — 任何一步失敗都不得擋住登出流程。
 */
export async function clearPushOnLogout(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        // 先通知後端刪除該端點，再於瀏覽器端取消訂閱。
        await unsubscribePush(sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
    }
    // 清掉本 App 的 SW caches，避免同裝置下一位使用者看到殘留殼。
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('easyacct-'))
          .map((k) => caches.delete(k)),
      );
    }
  } catch {
    // best-effort：清理失敗不影響登出。
  }
}
