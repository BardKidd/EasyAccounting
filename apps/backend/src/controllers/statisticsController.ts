import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import statisticsServices from '@/services/statisticsServices';

const getOverviewTrend = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const body = req.body;

    const result = await statisticsServices.getOverviewTrend(body, userId);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Get overview trend successfully', null)
      );
  });
};

export default {
  getOverviewTrend,
};
