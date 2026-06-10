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

/**
 * 忘記密碼 — 發送重設密碼信件
 */
export const forgotPassword = async (
  email: string,
): Promise<ResponseHelper<null>> => {
  return await apiHandler('/forgot-password', 'post', { email });
};

/**
 * 重設密碼 — 驗證 token 並更新密碼
 */
export const resetPassword = async (data: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<ResponseHelper<null>> => {
  return await apiHandler('/reset-password', 'post', data);
};

/**
 * 切換本位幣（多幣別）。後端會用歷史匯率一次性重算所有 amountInBase；
 * 缺匯率時回傳失敗並帶缺漏清單訊息。
 */
export const changeBaseCurrency = async (
  baseCurrencyCode: string,
): Promise<
  ResponseHelper<{
    changed: boolean;
    oldBaseCode: string;
    newBaseCode: string;
    transactionsRecomputed: number;
    budgetsConverted: number;
  }>
> => {
  return await apiHandler('/user/base-currency', 'patch', {
    baseCurrencyCode,
  });
};
