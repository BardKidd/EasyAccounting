import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  UpdateProfileInput,
  ChangePasswordInput,
} from '@repo/shared';

// 個人檔案 API 一律 self-scoped：不帶 userId，後端以 token 識別身分

export const updateProfile = async (
  data: UpdateProfileInput,
): Promise<ResponseHelper<{ name: string }>> => {
  return await apiHandler('/user/profile', 'patch', data);
};

export const changePassword = async (
  data: ChangePasswordInput,
): Promise<ResponseHelper<null>> => {
  return await apiHandler('/user/password', 'patch', data);
};

export const deleteAccount = async (): Promise<ResponseHelper<null>> => {
  return await apiHandler('/user/me', 'delete', null);
};
