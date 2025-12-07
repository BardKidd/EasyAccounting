import { apiHandler } from '@/lib/utils';
import { ResponseHelper, AccountType } from '@repo/shared';

export const getPersonnelAccounts = async () => {
  try {
    const result = (await apiHandler(
      `/personnel-accounts`,
      'get',
      null
    )) as ResponseHelper<AccountType[]>;
    if (result.isSuccess) {
      return result.data;
    }
    throw new Error(result.message);
  } catch (err) {
    throw err;
  }
};
