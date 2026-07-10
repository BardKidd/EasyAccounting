import excelServices from '@/services/excelServices';
import { responseHelper, simplifyTryCatch } from '@/utils/common';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ExcelExportMode, ExcelImportMode } from '@repo/shared';

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
    // ?mode=edit → 編輯用（含隱藏 id）；其餘 → 純匯出（無 id）
    const mode =
      req.query.mode === ExcelExportMode.EDIT
        ? ExcelExportMode.EDIT
        : ExcelExportMode.EXPORT;
    const url = await excelServices.exportUserTransactionsExcel(userId, mode);
    res.status(StatusCodes.OK).json(responseHelper(true, url, 'success', null));
  });
};

const exportUserTransactionsCsv = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const url = await excelServices.exportUserTransactionsCsv(userId);
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

    // 支援 form 欄位或 query 帶 mode；mode=edit → 編輯既有交易，否則新增
    const rawMode = req.body?.mode ?? req.query?.mode;
    const mode =
      rawMode === ExcelImportMode.EDIT
        ? ExcelImportMode.EDIT
        : ExcelImportMode.CREATE;

    const result = await excelServices.importNewTransactionsExcel(
      userId,
      file.buffer,
      mode
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
  exportUserTransactionsCsv,
  importNewTransactionsExcel,
};
