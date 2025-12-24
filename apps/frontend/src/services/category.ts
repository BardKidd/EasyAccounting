import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  CategoryType,
  CreateCategoryInput,
} from '@repo/shared';

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

export const createCategory = async (data: CreateCategoryInput) => {
  try {
    const result = (await apiHandler(
      '/category',
      'post',
      data
    )) as ResponseHelper<any>;
    return result;
  } catch (err) {
    throw err;
  }
};

export const updateCategory = async (data: any) => {
  try {
    const result = (await apiHandler(
      `/category/${data.id}`,
      'put',
      data
    )) as ResponseHelper<any>;
    return result;
  } catch (err) {
    throw err;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const result = (await apiHandler(
      `/category/${id}`,
      'delete',
      null
    )) as ResponseHelper<any>;
    return result;
  } catch (err) {
    throw err;
  }
};
