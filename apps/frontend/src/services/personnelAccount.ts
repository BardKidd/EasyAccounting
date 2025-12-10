import { apiHandler, getErrorMessage } from '@/lib/utils';
import { ResponseHelper, AccountType, UpdateAccountInput } from '@repo/shared';
import { CreateAccountInput } from '@repo/shared';

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

export const createAccount = async (account: CreateAccountInput) => {
  try {
    const res = await apiHandler('/account', 'POST', account);
    return res;
  } catch (err) {
    console.error(err);
    throw new Error(getErrorMessage(err));
  }
};

export const updateAccount = async (account: UpdateAccountInput) => {
  try {
    const res = await apiHandler(`/account/${account.id}`, 'PUT', account);
    return res;
  } catch (err) {
    console.error(err);
    throw new Error(getErrorMessage(err));
  }
};

export const deleteAccount = async (accountId: string) => {
  try {
    const res = await apiHandler(`/account/${accountId}`, 'DELETE', null);
    return res;
  } catch (err) {
    console.error(err);
    throw new Error(getErrorMessage(err));
  }
};
