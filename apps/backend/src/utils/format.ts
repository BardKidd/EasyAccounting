import { isZeroDecimalCurrency } from '@repo/shared';

export const formatCurrency = (val: number, currency: string = 'TWD') => {
  const fractionDigits = isZeroDecimalCurrency(currency) ? 0 : 2;
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: fractionDigits,
  }).format(val);
};

export const formatMonthLabel = (month: number) => {
  const monthMapping: Record<number, string> = {
    1: '一月',
    2: '二月',
    3: '三月',
    4: '四月',
    5: '五月',
    6: '六月',
    7: '七月',
    8: '八月',
    9: '九月',
    10: '十月',
    11: '十一月',
    12: '十二月',
  };
  return monthMapping[month];
};
