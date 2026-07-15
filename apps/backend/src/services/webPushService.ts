import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';

// Web Push 發送核心（spec §6）。VAPID 私鑰只存後端 .env，公鑰以 NEXT_PUBLIC_VAPID_PUBLIC_KEY 給前端。
// VAPID 採 lazy init：第一次要送時才 setVapidDetails（讀當下 env），未設金鑰 / 金鑰格式錯誤 → 停用發送，
// 不在 import / boot 時 throw（避免 cron / 測試載入即崩）。

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@easyaccounting.app';

let vapidReady = false;

/** 是否已設定 VAPID 金鑰（供前端 / 呼叫端判斷推播是否啟用）。 */
export const isConfigured = () =>
  !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** 確保 web-push 已帶入 VAPID；回傳能否發送。壞金鑰不 throw，只停用。 */
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, pub, priv);
    vapidReady = true;
    return true;
  } catch (err: any) {
    console.error('[WebPush] Invalid VAPID keys — push disabled:', err?.message);
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // 點擊通知後開啟的路徑（預設 /dashboard）
  tag?: string; // 同 tag 的通知會覆蓋，避免洗版
}

/**
 * 對單一使用者的所有有效訂閱發送推播。
 * 送出若回 404/410（訂閱失效）→ 當場從 DB 刪除該筆，避免死列累積、白送。
 * 回傳實際成功送出的筆數。
 */
export const sendPushToUser = async (
  userId: string,
  payload: PushPayload,
): Promise<number> => {
  if (!ensureVapid()) return 0;

  const subs = await PushSubscription.findAll({ where: { userId } });
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
        sent += 1;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // 訂閱已失效：當場刪除（spec §6 失效清理）。
          await PushSubscription.destroy({ where: { id: sub.id } });
          console.log(
            `[WebPush] Removed expired subscription ${sub.id} (status ${status}).`,
          );
        } else {
          console.error(
            `[WebPush] Failed to send to subscription ${sub.id}:`,
            err?.message ?? err,
          );
        }
      }
    }),
  );

  return sent;
};

export default { isConfigured, sendPushToUser };
