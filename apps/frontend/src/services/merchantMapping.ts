import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  MerchantMappingListItem,
  UpdateMerchantMappingInput,
} from '@repo/shared';

export const getMerchantMappings = async (includeDisabled = false) => {
  try {
    const url = `/merchant-mappings${includeDisabled ? '?includeDisabled=true' : ''}`;
    const result = (await apiHandler(
      url,
      'get',
      null,
    )) as ResponseHelper<MerchantMappingListItem[]>;
    if (result.isSuccess) {
      return result.data;
    }
    throw new Error(result.message);
  } catch (err) {
    throw err;
  }
};

export const updateMerchantMapping = async (
  id: string,
  data: UpdateMerchantMappingInput,
) => {
  try {
    const result = (await apiHandler(
      `/merchant-mappings/${id}`,
      'put',
      data,
    )) as ResponseHelper<MerchantMappingListItem>;
    return result;
  } catch (err) {
    throw err;
  }
};

export const deleteMerchantMapping = async (id: string) => {
  try {
    const result = (await apiHandler(
      `/merchant-mappings/${id}`,
      'delete',
      null,
    )) as ResponseHelper<unknown>;
    return result;
  } catch (err) {
    throw err;
  }
};
