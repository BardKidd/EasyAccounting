import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  TransactionRuleListItem,
  CreateTransactionRuleInput,
  UpdateTransactionRuleInput,
} from '@repo/shared';

export const getRules = async (includeDisabled = false) => {
  try {
    const url = `/rules${includeDisabled ? '?includeDisabled=true' : ''}`;
    const result = (await apiHandler(
      url,
      'get',
      null,
    )) as ResponseHelper<TransactionRuleListItem[]>;
    if (result.isSuccess) return result.data;
    throw new Error(result.message);
  } catch (err) {
    throw err;
  }
};

export const createRule = async (data: CreateTransactionRuleInput) => {
  try {
    return (await apiHandler(
      '/rules',
      'post',
      data,
    )) as ResponseHelper<TransactionRuleListItem>;
  } catch (err) {
    throw err;
  }
};

export const updateRule = async (
  id: string,
  data: UpdateTransactionRuleInput,
) => {
  try {
    return (await apiHandler(
      `/rules/${id}`,
      'put',
      data,
    )) as ResponseHelper<TransactionRuleListItem>;
  } catch (err) {
    throw err;
  }
};

export const deleteRule = async (id: string) => {
  try {
    return (await apiHandler(
      `/rules/${id}`,
      'delete',
      null,
    )) as ResponseHelper<unknown>;
  } catch (err) {
    throw err;
  }
};

export const reorderRules = async (orderedIds: string[]) => {
  try {
    return (await apiHandler('/rules/reorder', 'put', {
      orderedIds,
    })) as ResponseHelper<unknown>;
  } catch (err) {
    throw err;
  }
};
