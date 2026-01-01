import excelServices from '@/services/excelServices';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const getAllCategoriesHyphenString = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const categories = await excelServices.getAllCategoriesHyphenString(userId);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, categories, 'success', null));
  });
};

const exportTransactionsTemplateExcel = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const url = await excelServices.exportTransactionsTemplateExcel(userId);
    res.status(StatusCodes.OK).json(responseHelper(true, url, 'success', null));
  });
};

const exportUserTransactionsExcel = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const url = await excelServices.exportUserTransactionsExcel(userId);
    res.status(StatusCodes.OK).json(responseHelper(true, url, 'success', null));
  });
};

export default {
  getAllCategoriesHyphenString,
  exportTransactionsTemplateExcel,
  exportUserTransactionsExcel,
};
