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

export const importTransactions = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/excel/import-transactions`,
    {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }
  );
  const resJson = await res.json();
  const result = resJson.data;
  return result as { isSuccess: true; message: string; errorUrl?: string };
};

export default {
  getTransactionTemplateUrl,
  getTransactionsExcelUrl,
  importTransactions,
};
