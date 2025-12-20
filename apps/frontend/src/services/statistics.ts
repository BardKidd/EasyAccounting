import { apiHandler, getErrorMessage } from '@/lib/utils';
import {
  OverviewTrendType,
  OverviewTop3CategoriesType,
  OverviewTop3ExpensesType,
  PeriodType,
  ResponseHelper,
} from '@repo/shared';
import { toast } from 'sonner';

export const getOverviewTrend = async (
  startDate: string,
  endDate: string
): Promise<OverviewTrendType> => {
  try {
    const result = (await apiHandler(`/statistics/overview/trend`, 'post', {
      startDate,
      endDate,
    })) as ResponseHelper<OverviewTrendType>;
    if (result.isSuccess) {
      return result.data;
    }
    return {
      income: 0,
      expense: 0,
      transferIn: 0,
      transferOut: 0,
      balance: 0,
    };
  } catch (error) {
    toast.error(getErrorMessage(error));
    return {
      income: 0,
      expense: 0,
      transferIn: 0,
      transferOut: 0,
      balance: 0,
    };
  }
};

export const getOverviewTop3Categories = async (
  startDate: string,
  endDate: string
) => {
  try {
    const result = await apiHandler(
      `/statistics/overview/top3Categories`,
      'post',
      {
        startDate,
        endDate,
      }
    );
    if (result.isSuccess) {
      return result.data.map((item: OverviewTop3CategoriesType) => ({
        ...item,
        amount: Number(item.amount),
      }));
    }
    return [];
  } catch (error) {
    toast.error(getErrorMessage(error));
    return [];
  }
};

export const getOverviewTop3Expenses = async (
  startDate: string,
  endDate: string
): Promise<OverviewTop3ExpensesType[]> => {
  try {
    const result = (await apiHandler(
      `/statistics/overview/top3Expenses`,
      'post',
      {
        startDate,
        endDate,
      }
    )) as ResponseHelper<OverviewTop3ExpensesType[]>;
    if (result.isSuccess) {
      return result.data.map((item) => ({
        ...item,
        amount: Number(item.amount),
      }));
    }
    return [];
  } catch (error) {
    toast.error(getErrorMessage(error));
    return [];
  }
};
