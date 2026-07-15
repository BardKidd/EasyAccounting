import { apiHandler } from '@/lib/utils';
import {
  PushSubscriptionSchema,
  ResponseHelper,
} from '@repo/shared';

// Web Push 訂閱上報（spec §6）。payload 形狀與後端 validate 共用 @repo/shared 的 pushSubscriptionSchema。
export const subscribePush = async (subscription: PushSubscriptionSchema) => {
  const result = (await apiHandler(
    '/notifications/subscribe',
    'post',
    subscription
  )) as ResponseHelper<null>;
  if (result.isSuccess) return true;
  throw new Error(result.message);
};

export const unsubscribePush = async (endpoint: string) => {
  const result = (await apiHandler('/notifications/unsubscribe', 'post', {
    endpoint,
  })) as ResponseHelper<null>;
  if (result.isSuccess) return true;
  throw new Error(result.message);
};

export const getPushStatus = async () => {
  const result = (await apiHandler(
    '/notifications/status',
    'get',
    null
  )) as ResponseHelper<{ subscribed: boolean }>;
  if (result.isSuccess) return result.data;
  throw new Error(result.message);
};
