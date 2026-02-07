export enum StatisticsType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  BALANCE = 'BALANCE',
}

interface StatisticsTypeConfig {
  label: string;
  color: string;
  tailwindColor: string;
  legendColor: string;
}

export const STATISTICS_CONFIG: Record<StatisticsType, StatisticsTypeConfig> = {
  [StatisticsType.INCOME]: {
    label: '收入',
    color: '#14b8a6', // teal-500
    tailwindColor: 'text-teal-500',
    legendColor: 'bg-teal-500',
  },
  [StatisticsType.EXPENSE]: {
    label: '支出',
    color: '#f43f5e', // rose-500
    tailwindColor: 'text-rose-500',
    legendColor: 'bg-rose-500',
  },
  [StatisticsType.TRANSFER_IN]: {
    label: '轉入',
    color: '#0ea5e9', // sky-500
    tailwindColor: 'text-sky-500',
    legendColor: 'bg-sky-500',
  },
  [StatisticsType.TRANSFER_OUT]: {
    label: '轉出',
    color: '#f59e0b', // amber-500
    tailwindColor: 'text-amber-500',
    legendColor: 'bg-amber-500',
  },
  [StatisticsType.BALANCE]: {
    label: '餘額',
    color: '#8b5cf6', // violet-500
    tailwindColor: 'text-violet-500',
    legendColor: 'bg-violet-500',
  },
};
