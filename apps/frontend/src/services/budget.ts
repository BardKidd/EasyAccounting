import { apiHandler, getErrorMessage } from '@/lib/utils';
import type {
  ResponseHelper,
  BudgetStatus,
  BudgetMonthView,
  InitBudgetInput,
  MoveMoneyInput,
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
