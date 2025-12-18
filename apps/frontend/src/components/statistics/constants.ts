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
    color: '#10b981', // emerald-500
    tailwindColor: 'text-emerald-500',
    legendColor: 'bg-emerald-500',
  },
  [StatisticsType.EXPENSE]: {
    label: '支出',
    color: '#ef4444', // red-500
    tailwindColor: 'text-red-500',
    legendColor: 'bg-red-500',
  },
  [StatisticsType.TRANSFER_IN]: {
    label: '轉入',
    color: '#3b82f6', // blue-500
    tailwindColor: 'text-blue-500',
    legendColor: 'bg-blue-500',
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
