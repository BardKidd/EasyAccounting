import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import budgetService, { BudgetError } from '@/services/budgetService';

/**
 * GET /budgets/:id/categories
 * 取得預算的子分類
 */
const getCategories = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgetId = req.params.id!;

    const categories = await budgetService.getBudgetCategories(
      budgetId,
      userId,
    );

    if (categories === null) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget not found', null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          categories,
          'Budget categories fetched successfully',
          null,
        ),
      );
  });
};

/**
 * POST /budgets/:id/categories
 * 新增子預算（驗證只允許 MainCategory）
 */
const createCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgetId = req.params.id!;
    const { categoryId, amount, isExcluded } = req.body;

    const result = await budgetService.createBudgetCategory(budgetId, userId, {
      categoryId,
      amount,
      isExcluded,
    });

    if (result.error === BudgetError.BUDGET_NOT_FOUND) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget not found', null));
    }

    if (result.error === BudgetError.NOT_MAIN_CATEGORY) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          responseHelper(
            false,
            null,
            'Only MainCategory (categories with Root parent) are allowed',
            null,
          ),
        );
    }

    if (result.error === BudgetError.ALREADY_EXISTS) {
      return res
        .status(StatusCodes.CONFLICT)
        .json(
          responseHelper(
            false,
            null,
            'This category is already added to the budget',
            null,
          ),
        );
    }

    res
      .status(StatusCodes.CREATED)
      .json(
        responseHelper(
          true,
          result.data,
          'Budget category created successfully',
          null,
        ),
      );
  });
};

/**
 * PUT /budgets/:id/categories/:catId
 * 更新子預算
 */
const updateCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgetId = req.params.id!;
    const budgetCategoryId = req.params.catId!;
    const { amount, isExcluded } = req.body;

    const result = await budgetService.updateBudgetCategory(
      budgetId,
      budgetCategoryId,
      userId,
      { amount, isExcluded },
    );

    if (result.error === BudgetError.BUDGET_NOT_FOUND) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget not found', null));
    }

    if (result.error === BudgetError.BUDGET_CATEGORY_NOT_FOUND) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget category not found', null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          result.data,
          'Budget category updated successfully',
          null,
        ),
      );
  });
};

/**
 * DELETE /budgets/:id/categories/:catId
 * 刪除子預算
 */
const deleteCategory = async (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userId = req.user.userId;
    const budgetId = req.params.id!;
    const budgetCategoryId = req.params.catId!;

    const result = await budgetService.deleteBudgetCategory(
      budgetId,
      budgetCategoryId,
      userId,
    );

    if (result.error === BudgetError.BUDGET_NOT_FOUND) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget not found', null));
    }

    if (result.error === BudgetError.BUDGET_CATEGORY_NOT_FOUND) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'Budget category not found', null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          null,
          'Budget category deleted successfully',
          null,
        ),
      );
  });
};

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
