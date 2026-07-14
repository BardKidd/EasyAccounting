import pushSubscriptionServices from '@/services/pushSubscriptionServices';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// Web Push 訂閱端點（spec §6）。userId 一律取已驗證身分，勿信任 body（比照 personnelNotification 安全修復）。

const subscribe = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    await pushSubscriptionServices.saveSubscription(userId, req.body);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, 'Push subscription saved', null));
  });
};

const unsubscribe = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    await pushSubscriptionServices.removeSubscription(userId, req.body.endpoint);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, 'Push subscription removed', null));
  });
};

const status = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const subscribed = await pushSubscriptionServices.hasSubscription(userId);
    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, { subscribed }, 'Push subscription status', null),
      );
  });
};

export default { subscribe, unsubscribe, status };
