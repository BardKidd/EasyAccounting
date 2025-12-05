import { apiHandler, getErrorMessage } from '@/lib/utils';
import { ResponseHelper } from '@repo/shared';
import { toast } from 'sonner';
import { Account } from '@repo/shared';
export const getPersonnelAccounts = async () => {
  try {
    const result = (await apiHandler(
      `/personnel-accounts`,
      'get',
      null
    )) as ResponseHelper<Account[]>;
    if (result.isSuccess) {
      return result.data;
    }
    return [];
  } catch (err) {
    console.error(err);
    toast.error(getErrorMessage(err));
    return [];
  }
};
