import PushSubscription from '@/models/PushSubscription';
import { PushSubscriptionSchema } from '@repo/shared';

/**
 * 儲存 / 更新使用者的推播訂閱端點（spec §6）。
 * endpoint 全域唯一：同一端點重複訂閱（或換使用者登入同裝置）→ upsert 綁到當前 userId，
 * 避免死列累積並修正殘留他人綁定（配合登出清理，spec Edge Cases 4）。
 */
const saveSubscription = async (
  userId: string,
  payload: PushSubscriptionSchema,
) => {
  const existing = await PushSubscription.findOne({
    where: { endpoint: payload.endpoint },
  });

  if (existing) {
    await existing.update({
      userId,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
    });
    return existing;
  }

  return PushSubscription.create({
    userId,
    endpoint: payload.endpoint,
    p256dh: payload.keys.p256dh,
    auth: payload.keys.auth,
  });
};

/**
 * 取消訂閱：只刪「屬於該使用者」且 endpoint 相符的那筆（避免刪到他人）。
 */
const removeSubscription = async (userId: string, endpoint: string) => {
  await PushSubscription.destroy({ where: { userId, endpoint } });
  return true;
};

const hasSubscription = async (userId: string) => {
  const count = await PushSubscription.count({ where: { userId } });
  return count > 0;
};

export default { saveSubscription, removeSubscription, hasSubscription };
