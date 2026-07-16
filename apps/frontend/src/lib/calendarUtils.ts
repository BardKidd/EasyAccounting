import { TransactionType, RootType } from '@repo/shared';
import { isOperateTransaction, isIncomingTransfer } from '@repo/shared';
import { TRANSACTION_COLORS } from './transactionColors';

export interface CalendarEventType {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: TransactionType;
  type: RootType;
  amount: number;
  isTransfer: boolean;
}

/**
 * 將 Transaction 轉換為 CalendarEvent 格式
 */
export function transactionToCalendarEvent(
  tx: TransactionType,
): CalendarEventType {
  // 使用當天午夜 00:00:00，避免 RBC 拖曳時顯示跨日 span
  // time 欄位保留在 resource 供 Modal 排序使用
  const dateTime = new Date(`${tx.date}T00:00:00`);

  return {
    id: tx.id || '',
    title: tx.description || '',
    start: dateTime,
    end: dateTime,
    allDay: false,
    resource: tx,
    type: tx.type,
    amount: tx.amount,
    isTransfer: isOperateTransaction(tx),
  };
}

/**
 * 篩選日曆顯示的交易：排除轉帳收款方
 */
export function filterForCalendar(
  transactions: TransactionType[],
): TransactionType[] {
  return transactions.filter((tx) => !isIncomingTransfer(tx));
}

export interface DayIndicators {
  expense: boolean;
  income: boolean;
  transfer: boolean;
}

/**
 * 依日期彙整當日出現的交易類型（手機版日曆的小點指示）。
 * 轉帳只計扣款方（與 filterForCalendar 同一套排除規則）。
 */
export function getDayIndicators(
  transactions: TransactionType[],
): Map<string, DayIndicators> {
  const map = new Map<string, DayIndicators>();

  for (const tx of filterForCalendar(transactions)) {
    let indicators = map.get(tx.date);
    if (!indicators) {
      indicators = { expense: false, income: false, transfer: false };
      map.set(tx.date, indicators);
    }

    if (isOperateTransaction(tx)) {
      indicators.transfer = true;
    } else if (tx.type === RootType.INCOME) {
      indicators.income = true;
    } else if (tx.type === RootType.EXPENSE) {
      indicators.expense = true;
    }
  }

  return map;
}

export interface DaySummary {
  income: number;
  expense: number;
  balance: number;
}

/**
 * 計算一組（單日）交易的收入 / 支出 / 結餘。轉帳不列入。
 */
export function getDaySummary(transactions: TransactionType[]): DaySummary {
  const summary = transactions.reduce(
    (acc, tx) => {
      if (isOperateTransaction(tx)) return acc;
      const amount = Number(tx.amount) || 0;
      if (tx.type === RootType.INCOME) acc.income += amount;
      if (tx.type === RootType.EXPENSE) acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return { ...summary, balance: summary.income - summary.expense };
}

/**
 * 根據交易類型取得顏色 class（使用統一常數）
 */
export function getEventColor(type: RootType, isTransfer = false): string {
  if (isTransfer) {
    return TRANSACTION_COLORS.transfer.bg;
  }
  if (type === RootType.INCOME) {
    return TRANSACTION_COLORS.income.bg;
  }
  if (type === RootType.EXPENSE) {
    return TRANSACTION_COLORS.expense.bg;
  }
  return TRANSACTION_COLORS.default.bg;
}
