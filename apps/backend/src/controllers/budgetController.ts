import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import budgetService, { EffectiveFrom } from '@/services/budgetService';

/**
 * GET /budgets
 * 取得用戶所有預算（含使用率）
 */
const getAllBudgets = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgets = await budgetService.getAllBudgetsWithUsage(userId);

    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(true, budgets, 'Budgets fetched successfully', null),
      );
  });
};

/**
 * GET /budgets/:id
 * 取得單一預算詳情（含子預算、當前週期使用率）
 */
const getBudgetById = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgetId = req.params.id;

    const budget = await budgetService.getBudgetWithUsage(budgetId!, userId);

    if (!budget) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget not found', null));
    }

    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, budget, 'Budget fetched successfully', null));
  });
};

/**
 * POST /budgets
 * 建立預算
 */
const createBudget = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budget = await budgetService.createBudget(userId, req.body);

    res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, budget, 'Budget created successfully', null));
  });
};

/**
 * PUT /budgets/:id
 * 更新預算（需傳入 effectiveFrom: immediate | nextPeriod）
 */
const updateBudget = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgetId = req.params.id;
    const { effectiveFrom, ...updateData } = req.body;

    const budget = await budgetService.updateBudget(
      budgetId!,
      userId,
      updateData,
      effectiveFrom as EffectiveFrom,
    );

    if (!budget) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget not found', null));
    }

    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, budget, 'Budget updated successfully', null));
  });
};

/**
 * DELETE /budgets/:id
 * 軟刪除預算
 */
const deleteBudget = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgetId = req.params.id;

    const deleted = await budgetService.deleteBudget(budgetId!, userId);

    if (!deleted) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget not found', null));
    }

    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, 'Budget deleted successfully', null));
  });
};

export default {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
};
