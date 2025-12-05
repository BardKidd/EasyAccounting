import { apiHandler, getErrorMessage } from '@/lib/utils';
import { ResponseHelper, CategoryType } from '@repo/shared';
import { toast } from 'sonner';

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
    return [];
  } catch (err) {
    console.error(err);
    toast.error(getErrorMessage(err));
    return [];
  }
};
