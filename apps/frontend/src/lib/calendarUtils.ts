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
    title: tx.description || 'Transaction',
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
