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
 * 透過呼叫需要 auth 的 API 來驗證
 */
export const checkSession = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_DOMAIN}/user/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
};
