import personnelNotificationServices from '@/services/personnelNotificationServices';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const postPersonnelNotification = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId; // 安全性修復：改用已驗證身分，勿信任 req.body.userId
    // 預設只打開月報
    const payload = {
      isDailyNotification: false,
      isWeeklySummaryNotification: false,
      isMonthlyAnalysisNotification: true,
    };
    const result =
      await personnelNotificationServices.postPersonnelNotification(
        userId,
        payload
      );
    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result,
          'Post personnel notification successfully',
          null
        )
      );
  });
};

const getPersonnelNotification = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const result =
      await personnelNotificationServices.getPersonnelNotification(userId);
    if (result) {
      res
        .status(StatusCodes.OK)
        .json(
          responseHelper(
            true,
            result,
            'Get personnel notification successfully',
            null
          )
        );
    }
  });
};

const putPersonnelNotification = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const payload = req.body;
    const result = await personnelNotificationServices.putPersonnelNotification(
      userId,
      payload
    );
    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result,
          'Put personnel notification successfully',
          null
        )
      );
  });
};

export default {
  postPersonnelNotification,
  getPersonnelNotification,
  putPersonnelNotification,
};
