import { apiHandler, getErrorMessage } from '@/lib/utils';
import { ResponseHelper, TransactionType } from '@repo/shared';
import { redirect } from 'next/navigation';

interface GetTransactionsParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export const getTransactions = async (params: GetTransactionsParams) => {
  try {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.type) query.append('type', params.type);
    if (params.accountId) query.append('accountId', params.accountId);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString();
    const url = `/transactions${queryString ? `?${queryString}` : ''}`;

    const result = (await apiHandler(url, 'get', null)) as ResponseHelper<
      TransactionType[]
    >;

    if (result.isSuccess) {
      return result.data;
    }
    return [];
  } catch (err) {
    throw err;
  }
};
