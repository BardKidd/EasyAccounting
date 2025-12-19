import { apiHandler, getErrorMessage } from '@/lib/utils';
import { OverviewTrendType, PeriodType, ResponseHelper } from '@repo/shared';
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
