import { AccountType } from '@repo/shared';

export interface MonthlySummaryPoint {
  type: string;
  date: string;
  income: number;
  expense: number;
}

/** 取當月 [收入, 支出, 損益]；SummaryCards 與手機 Hero 共用，避免兩處口徑漂移。 */
export function calcThisMonthFinances(
  data: MonthlySummaryPoint[],
): [number, number, number] {
  const now = new Date();
  // Format: YYYY-MM
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}`;

  const thisPeriodData = data.find((item) => item.date === currentKey);

  if (thisPeriodData) {
    const profit = thisPeriodData.income - thisPeriodData.expense;
    return [thisPeriodData.income, thisPeriodData.expense, profit];
  }
  return [0, 0, 0];
}

export function calcTotalAssets(accounts: AccountType[]): number {
  return accounts.reduce((total, item) => total + Number(item.balance), 0);
}
