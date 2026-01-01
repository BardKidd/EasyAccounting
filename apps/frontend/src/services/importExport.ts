import { apiHandler, getErrorMessage } from '@/lib/utils';
import { ResponseHelper } from '@repo/shared';

export const getTransactionTemplateUrl = async () => {
  const res = await apiHandler('/excel/transaction-template', 'GET', undefined);
  return res.data as string;
};

export const getTransactionsExcelUrl = async () => {
  const res = await apiHandler('/excel/user-transactions', 'GET', undefined);
  return res.data as string;
};

export default {
  getTransactionTemplateUrl,
  getTransactionsExcelUrl,
};
