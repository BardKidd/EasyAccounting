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

const importNewTransactionsExcel = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      throw new Error('未有檔案上傳');
    }

    const result = await excelServices.importNewTransactionsExcel(
      userId,
      file.buffer
    );

    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, result, 'success', null));
  });
};

export default {
  getAllCategoriesHyphenString,
  exportTransactionsTemplateExcel,
  exportUserTransactionsExcel,
  importNewTransactionsExcel,
};
