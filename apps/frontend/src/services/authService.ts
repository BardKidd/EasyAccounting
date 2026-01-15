import { apiHandler } from '@/lib/utils';
import { ResponseHelper } from '@repo/shared';

export const logout = async (): Promise<ResponseHelper<null>> => {
  return await apiHandler('/logout', 'post', null);
};
