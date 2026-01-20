import { apiHandler } from '@/lib/utils';
import {
  Budget,
  BudgetDetail,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '@/types/budget';
import { ResponseHelper } from '@repo/shared';

// -----------------------------------------------------------------------------
// Budget CRUD
// -----------------------------------------------------------------------------

/**
 * 取得所有預算列表
 */
export const getBudgets = async (): Promise<ResponseHelper<Budget[]>> => {
  return apiHandler('/budgets', 'GET', null);
};

/**
 * 取得單一預算詳情（含使用率、子預算）
 */
export const getBudgetById = async (
  id: number,
): Promise<ResponseHelper<BudgetDetail>> => {
  return apiHandler(`/budgets/${id}`, 'GET', null);
};

/**
 * 建立預算
 */
export const createBudget = async (
  data: CreateBudgetRequest,
): Promise<ResponseHelper<Budget>> => {
  return apiHandler('/budgets', 'POST', data);
};

/**
 * 更新預算
 */
export const updateBudget = async (
  id: number,
  data: UpdateBudgetRequest,
): Promise<ResponseHelper<Budget>> => {
  return apiHandler(`/budgets/${id}`, 'PUT', data);
};

/**
 * 刪除預算（軟刪除）
 */
export const deleteBudget = async (
  id: number,
): Promise<ResponseHelper<void>> => {
  return apiHandler(`/budgets/${id}`, 'DELETE', null);
};

// -----------------------------------------------------------------------------
// BudgetCategory CRUD
// -----------------------------------------------------------------------------

interface CreateBudgetCategoryRequest {
  categoryId: number;
  amount: number;
  isExcluded?: boolean;
}

/**
 * 新增子預算（BudgetCategory）
 */
export const addBudgetCategory = async (
  budgetId: number,
  data: CreateBudgetCategoryRequest,
): Promise<ResponseHelper<any>> => {
  return apiHandler(`/budgets/${budgetId}/categories`, 'POST', data);
};

/**
 * 刪除子預算（BudgetCategory）
 */
export const removeBudgetCategory = async (
  budgetId: number,
  categoryId: number,
): Promise<ResponseHelper<void>> => {
  return apiHandler(
    `/budgets/${budgetId}/categories/${categoryId}`,
    'DELETE',
    null,
  );
};

// -----------------------------------------------------------------------------
// 匯出為 budgetService 物件（相容現有使用方式）
// -----------------------------------------------------------------------------

export const budgetService = {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  addBudgetCategory,
  removeBudgetCategory,
};
