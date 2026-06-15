import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  TagType,
  CreateTagInput,
  UpdateTagInput,
} from '@repo/shared';

export const getTags = async (includeArchived = false) => {
  try {
    const url = `/tags${includeArchived ? '?includeArchived=true' : ''}`;
    const result = (await apiHandler(
      url,
      'get',
      null,
    )) as ResponseHelper<TagType[]>;
    if (result.isSuccess) {
      return result.data;
    }
    throw new Error(result.message);
  } catch (err) {
    throw err;
  }
};

export const createTag = async (data: CreateTagInput) => {
  try {
    const result = (await apiHandler(
      '/tags',
      'post',
      data,
    )) as ResponseHelper<TagType>;
    return result;
  } catch (err) {
    throw err;
  }
};

export const updateTag = async (id: string, data: UpdateTagInput) => {
  try {
    const result = (await apiHandler(
      `/tags/${id}`,
      'put',
      data,
    )) as ResponseHelper<TagType>;
    return result;
  } catch (err) {
    throw err;
  }
};

export const deleteTag = async (id: string) => {
  try {
    const result = (await apiHandler(
      `/tags/${id}`,
      'delete',
      null,
    )) as ResponseHelper<any>;
    return result;
  } catch (err) {
    throw err;
  }
};
