import { apiHandler } from '@/lib/utils';

export interface SuggestedRate {
  base: string;
  quote: string;
  date: string | null;
  rate: number | null;
}

/**
 * 查建議匯率（base→quote，指定日期取 <= 該日最近一筆）。
 * 供交易表單跨幣轉帳/外幣交易預填或提示用。查無回 rate=null。
 */
export const getSuggestedRate = async (
  base: string,
  quote: string,
  date?: string,
): Promise<number | null> => {
  try {
    const q = new URLSearchParams({ base, quote });
    if (date) q.set('date', date);
    const result = await apiHandler(`/exchange-rate?${q.toString()}`, 'GET', null);
    if (result.isSuccess) {
      return (result.data as SuggestedRate)?.rate ?? null;
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
