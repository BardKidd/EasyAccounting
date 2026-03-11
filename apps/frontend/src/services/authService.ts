import { apiHandler } from '@/lib/utils';
import { ResponseHelper, UserType } from '@repo/shared';

export const logout = async (): Promise<ResponseHelper<null>> => {
  return await apiHandler('/logout', 'post', null);
};

export const guestLogin = async (): Promise<ResponseHelper<UserType>> => {
  return await apiHandler('/guest-login', 'post', null);
};

export const promote = async (data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<ResponseHelper<UserType>> => {
  return await apiHandler('/promote', 'post', data);
};

/**
 * 檢查當前 session 是否有效
 * 透過 GET /api/auth/me 驗證 cookie token
 */
export const checkSession = async (): Promise<ResponseHelper<UserType>> => {
  return await apiHandler('/me', 'get', null);
};
