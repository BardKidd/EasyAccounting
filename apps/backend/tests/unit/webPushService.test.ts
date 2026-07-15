import { describe, it, expect, vi, beforeEach } from 'vitest';

// VAPID 採 lazy init（讀 env 於發送時），故此處設 env 即可，不需在 import 前搶跑。
process.env.VAPID_PUBLIC_KEY = 'test-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-private-key';

// 純邏輯測試（不連 DB / 不真的送推播）：mock web-push 與 PushSubscription model，
// 驗證「送給所有訂閱 + 失效訂閱(410/404)當場刪除」（spec §6）。

const setVapidDetails = vi.fn();
const sendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: (...args: any[]) => setVapidDetails(...args),
    sendNotification: (...args: any[]) => sendNotification(...args),
  },
}));

const findAll = vi.fn();
const destroy = vi.fn();
vi.mock('@/models/PushSubscription', () => ({
  default: {
    findAll: (...args: any[]) => findAll(...args),
    destroy: (...args: any[]) => destroy(...args),
  },
}));

import webPushService from '@/services/webPushService';

const sub = (id: string) => ({
  id,
  endpoint: `https://push.example/${id}`,
  p256dh: 'p',
  auth: 'a',
});

describe('webPushService.sendPushToUser', () => {
  beforeEach(() => {
    findAll.mockReset();
    destroy.mockReset();
    sendNotification.mockReset();
  });

  it('對所有有效訂閱發送並回傳成功筆數', async () => {
    findAll.mockResolvedValue([sub('s1'), sub('s2')]);
    sendNotification.mockResolvedValue({});

    const sent = await webPushService.sendPushToUser('u1', {
      title: '記帳提醒',
      body: '別忘了記帳',
    });

    expect(sent).toBe(2);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('送出回 410 → 刪除該筆失效訂閱，不計入成功數', async () => {
    findAll.mockResolvedValue([sub('good'), sub('gone')]);
    sendNotification.mockImplementation((subscription: any) => {
      if (subscription.endpoint.endsWith('/gone')) {
        return Promise.reject({ statusCode: 410 });
      }
      return Promise.resolve({});
    });

    const sent = await webPushService.sendPushToUser('u1', {
      title: 't',
      body: 'b',
    });

    expect(sent).toBe(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledWith({ where: { id: 'gone' } });
  });

  it('無任何訂閱時回傳 0 且不發送', async () => {
    findAll.mockResolvedValue([]);
    const sent = await webPushService.sendPushToUser('u1', {
      title: 't',
      body: 'b',
    });
    expect(sent).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
