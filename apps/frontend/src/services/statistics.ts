import { apiHandler, getErrorMessage } from '@/lib/utils';
import {
  OverviewTrendType,
  OverviewTop3CategoriesType,
  OverviewTop3ExpensesType,
  PeriodType,
  ResponseHelper,
  DetailTabDataType,
  CategoryTabDataType,
  RankingTabDataType,
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

export const getDetailTabData = async (
  startDate: string,
  endDate: string
): Promise<DetailTabDataType[]> => {
  try {
    const result = (await apiHandler(`/statistics/detail`, 'post', {
      startDate,
      endDate,
    })) as ResponseHelper<DetailTabDataType[]>;
    if (result.isSuccess) {
      return result.data.map((item: DetailTabDataType) => ({
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

export const getCategoryTabData = async (
  startDate: string,
  endDate: string
): Promise<CategoryTabDataType[]> => {
  try {
    const result = (await apiHandler(`/statistics/category`, 'post', {
      startDate,
      endDate,
    })) as ResponseHelper<CategoryTabDataType[]>;
    if (result.isSuccess) {
      return result.data;
    }
    return [];
  } catch (error) {
    toast.error(getErrorMessage(error));
    return [];
  }
};

export const getRankingTabData = async (
  startDate: string,
  endDate: string
): Promise<RankingTabDataType[]> => {
  try {
    const result = (await apiHandler(`/statistics/ranking`, 'post', {
      startDate,
      endDate,
    })) as ResponseHelper<RankingTabDataType[]>;
    if (result.isSuccess) {
      return result.data;
    }
    return [];
  } catch (error) {
    toast.error(getErrorMessage(error));
    return [];
  }
};
