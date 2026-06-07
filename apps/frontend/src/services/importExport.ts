import { apiHandler, getErrorMessage } from '@/lib/utils';
import { ResponseHelper, ExcelExportMode, ExcelImportMode } from '@repo/shared';

export const getTransactionTemplateUrl = async () => {
  const res = await apiHandler('/excel/transaction-template', 'GET', undefined);
  return res.data as string;
};

export const getTransactionsExcelUrl = async (
  mode: ExcelExportMode = ExcelExportMode.EXPORT
) => {
  const res = await apiHandler(
    `/excel/user-transactions?mode=${mode}`,
    'GET',
    undefined
  );
  return res.data as string;
};

export const importTransactions = async (
  file: File,
  mode: ExcelImportMode = ExcelImportMode.CREATE
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
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
