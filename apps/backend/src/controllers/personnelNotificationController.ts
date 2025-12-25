import personnelNotificationServices from '@/services/personnelNotificationServices';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const postPersonnelNotification = async (req: Request, res: Response) => {
  await simplifyTryCatch(req, res, async () => {
    const userId = req.body.userId;
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

export default {
  postPersonnelNotification,
};
