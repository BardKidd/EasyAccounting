import { apiHandler, getErrorMessage } from '@/lib/utils';
import type {
  ResponseHelper,
  BudgetStatus,
  BudgetMonthView,
  InitBudgetInput,
  MoveMoneyInput,
  UpsertTargetInput,
  AutoAssignStrategy,
} from '@repo/shared';

export const getBudgetStatus = async (): Promise<BudgetStatus> => {
  const result = (await apiHandler(
    '/budget',
    'GET',
    null,
  )) as ResponseHelper<BudgetStatus>;
  if (result.isSuccess) return result.data;
  throw new Error(result.message);
};

export const initBudget = async (data: InitBudgetInput): Promise<void> => {
  try {
    await apiHandler('/budget/init', 'POST', data);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
};

export const getBudgetMonth = async (
  month: string,
): Promise<BudgetMonthView> => {
  const result = (await apiHandler(
    `/budget/months/${month}`,
    'GET',
    null,
  )) as ResponseHelper<BudgetMonthView>;
  if (result.isSuccess) return result.data;
  throw new Error(result.message);
};

export const assignBudget = async (
  month: string,
  categoryId: string,
  assigned: number,
): Promise<void> => {
  try {
    await apiHandler(
      `/budget/months/${month}/assignments/${categoryId}`,
      'PUT',
      { assigned },
    );
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
};

export const moveBudgetMoney = async (
  month: string,
  data: MoveMoneyInput,
): Promise<void> => {
  try {
    await apiHandler(`/budget/months/${month}/move`, 'POST', data);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
};

// ---------- Targets / Auto-Assign（Phase 2 ③）----------

export const upsertBudgetTarget = async (
  categoryId: string,
  data: UpsertTargetInput,
): Promise<void> => {
  try {
    await apiHandler(`/budget/categories/${categoryId}/target`, 'PUT', data);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
};

export const deleteBudgetTarget = async (categoryId: string): Promise<void> => {
  try {
    await apiHandler(`/budget/categories/${categoryId}/target`, 'DELETE', null);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
};

export const autoAssignBudget = async (
  month: string,
  strategy: AutoAssignStrategy,
): Promise<void> => {
  try {
    await apiHandler(`/budget/months/${month}/auto-assign`, 'POST', {
      strategy,
    });
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
};

// CC Payment 撥備（Phase 2 ④）
export const ccAssignBudget = async (
  month: string,
  accountId: string,
  assigned: number,
): Promise<void> => {
  try {
    await apiHandler(
      `/budget/months/${month}/cc-assignments/${accountId}`,
      'PUT',
      { assigned },
    );
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
};
