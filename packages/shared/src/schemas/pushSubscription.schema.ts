import { z } from 'zod';

// Web Push 訂閱（PWA / iOS 16.4+）。前端由 `registration.pushManager.subscribe()`
// 取得的 PushSubscription.toJSON() 形狀：{ endpoint, keys: { p256dh, auth }, ... }。
// 前後端共用同一 schema（跨層慣例）：前端上報 body 與後端 validate middleware 皆從此衍生。
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  // expirationTime 由瀏覽器提供，多半為 null；存起來備日後判斷即可。
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscriptionSchema = z.infer<typeof pushSubscriptionSchema>;

// 取消訂閱：只需 endpoint 定位該筆（登出 / 關閉開關 / 換裝置）。
export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export type PushUnsubscribeSchema = z.infer<typeof pushUnsubscribeSchema>;
