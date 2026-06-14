import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import budgetService from '@/services/budgetService';

/**
 * 預算 service 拋出的都是業務錯誤（缺匯率、月份超範圍、非支出 Main 分類、未啟用…），
 * 統一回 400 + responseHelper（沿用 userController.changeBaseCurrency 語意），
 * 讓前端能讀到訊息（如「缺匯率→請先補匯率」）。外層 simplifyTryCatch 仍兜底未預期錯誤為 500。
 * （budget-ynab review M2）
 */
const runBudget = (
  req: Request,
  res: Response,
  cb: () => Promise<void>,
) => {
  simplifyTryCatch(req, res, async () => {
    try {
      await cb();
    } catch (err: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, err?.message || '操作失敗', null));
    }
  });
};

const getStatus = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const data = await budgetService.getStatus(userId);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, data, 'Budget status retrieved', null));
  });
};

const init = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const { startMonth, accountOverrides } = req.body;
    await budgetService.initBudget(userId, startMonth, accountOverrides);
    res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, null, '預算已啟用', null));
  });
};

const updateSettings = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const { startMonth } = req.body;
    await budgetService.updateSettings(userId, startMonth);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '預算設定已更新', null));
  });
};

const getMonthView = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const month = req.params.month!;
    const data = await budgetService.getMonthView(userId, month);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, data, 'Month view retrieved', null));
  });
};

const assignBudget = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const month = req.params.month!;
    const categoryId = req.params.categoryId!;
    const { assigned } = req.body;
    await budgetService.assign(userId, month, categoryId, assigned);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '分配已更新', null));
  });
};

const moveMoney = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const month = req.params.month!;
    const {
      fromCategoryId,
      toCategoryId,
      amount,
      fromCreditAccountId,
      toCreditAccountId,
    } = req.body;
    await budgetService.moveMoney(
      userId,
      month,
      fromCategoryId ?? null,
      toCategoryId ?? null,
      amount,
      fromCreditAccountId ?? null,
      toCreditAccountId ?? null,
    );
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '搬錢完成', null));
  });
};

// CC Payment 信封分配（Phase 2 ④）
const assignCreditPayment = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const month = req.params.month!;
    const accountId = req.params.accountId!;
    const { assigned } = req.body;
    await budgetService.ccAssign(userId, month, accountId, assigned);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '信用卡撥備已更新', null));
  });
};

const upsertTarget = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const categoryId = req.params.categoryId!;
    await budgetService.upsertTarget(userId, categoryId, req.body);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '目標已更新', null));
  });
};

const deleteTarget = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const categoryId = req.params.categoryId!;
    await budgetService.deleteTarget(userId, categoryId);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '目標已刪除', null));
  });
};

const autoAssign = (req: Request, res: Response) => {
  runBudget(req, res, async () => {
    const { userId } = req.user;
    const month = req.params.month!;
    const { strategy } = req.body;
    await budgetService.autoAssign(userId, month, strategy);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '自動分配完成', null));
  });
};

export default {
  getStatus,
  init,
  updateSettings,
  getMonthView,
  assignBudget,
  assignCreditPayment,
  moveMoney,
  upsertTarget,
  deleteTarget,
  autoAssign,
};
