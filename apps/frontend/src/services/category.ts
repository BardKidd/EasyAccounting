import { apiHandler } from '@/lib/utils';
import { ResponseHelper, CategoryType } from '@repo/shared';

export const getCategories = async () => {
  try {
    const result = (await apiHandler(
      '/category',
      'get',
      null
    )) as ResponseHelper<CategoryType[]>;
    if (result.isSuccess) {
      return result.data;
    }
    throw new Error(result.message);
  } catch (err) {
    throw err;
  }
};
