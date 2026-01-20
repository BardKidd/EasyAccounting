import { apiHandler, getErrorMessage } from '@/lib/utils';
import {
  ResponseHelper,
  TransactionType,
  GetTransactionsDashboardSummarySchema,
  CreateTransactionSchema,
  TransactionResponse,
  CreateTransferSchema,
  UpdateTransactionSchema,
} from '@repo/shared';
import { toast } from 'sonner';

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
    const url = `/transaction/date${queryString ? `?${queryString}` : ''}`;

    const result = (await apiHandler(
      url,
      'get',
      null
    )) as ResponseHelper<TransactionResponse>;

    if (result.isSuccess) {
      return result.data;
    }
    return {
      items: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };
  } catch (err) {
    throw err;
  }
};

export const getTransactionsSummary = async (
  query: GetTransactionsDashboardSummarySchema
) => {
  try {
    const result = (await apiHandler(
      '/transaction/summary',
      'POST',
      query
    )) as ResponseHelper<{
      trends: {
        type: string;
        date: string;
        income: number;
        expense: number;
      }[];
      summary: { income: number; expense: number; balance: number };
    }>;

    if (result.isSuccess) {
      return result.data;
    }
    return {
      trends: [],
      summary: { income: 0, expense: 0, balance: 0 },
    };
  } catch (err) {
    console.log(getErrorMessage(err));
    return {
      trends: [],
      summary: { income: 0, expense: 0, balance: 0 },
    };
  }
};

export const addTransaction = async (transaction: CreateTransactionSchema) => {
  try {
    const result = (await apiHandler(
      '/transaction',
      'post',
      transaction
    )) as ResponseHelper<TransactionType>;

    if (result.isSuccess) {
      return result;
    }
    return null;
  } catch (err) {
    throw err;
  }
};

export const addTransfer = async (transaction: CreateTransferSchema) => {
  try {
    const result = (await apiHandler(
      '/transaction/transfer',
      'post',
      transaction
    )) as ResponseHelper<TransactionType>;

    if (result.isSuccess) {
      return result;
    }
    return null;
  } catch (err) {
    throw err;
  }
};

export const updateTransaction = async (
  id: string,
  transaction: UpdateTransactionSchema
) => {
  try {
    const result = (await apiHandler(
      `/transaction/${id}`,
      'put',
      transaction
    )) as ResponseHelper<TransactionType>;

    if (result.isSuccess) {
      return result;
    }
    return null;
  } catch (err) {
    throw err;
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    const result = (await apiHandler(
      `/transaction/${id}`,
      'delete',
      null
    )) as ResponseHelper<any>;

    if (result.isSuccess) {
      return result;
    }
    return null;
  } catch (err) {
    throw err;
  }
};

