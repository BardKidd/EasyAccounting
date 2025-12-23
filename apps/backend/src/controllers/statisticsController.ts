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

const getOverviewTop3Categories = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const body = req.body;

    const result = await statisticsServices.getOverviewTop3Categories(
      body,
      userId
    );

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result,
          'Get overview top 3 categories successfully',
          null
        )
      );
  });
};

const getOverviewTop3Expenses = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const body = req.body;

    const result = await statisticsServices.getOverviewTop3Expenses(
      body,
      userId
    );

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result,
          'Get overview top 3 expenses successfully',
          null
        )
      );
  });
};

const getDetailTabData = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const body = req.body;

    const result = await statisticsServices.getDetailTabData(body, userId);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Get detail tab data successfully', null)
      );
  });
};

const getCategoryTabData = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const body = req.body;

    const result = await statisticsServices.getCategoryTabData(body, userId);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Get category tab data successfully', null)
      );
  });
};

const getRankingTabData = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const body = req.body;

    const result = await statisticsServices.getRankingTabData(body, userId);

    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, result, 'Get ranking tab data successfully', null)
      );
  });
};

export default {
  getOverviewTrend,
  getOverviewTop3Categories,
  getOverviewTop3Expenses,
  getDetailTabData,
  getCategoryTabData,
  getRankingTabData,
};
