import { TransactionType, RootType } from '..';

/**
 * 判斷是否為操作類交易（有 targetAccountId）
 */
export function isOperateTransaction(tx: TransactionType): boolean {
  return tx.targetAccountId !== null && tx.targetAccountId !== undefined;
}

/**
 * 判斷是否為操作類交易的扣款方（type = EXPENSE 且有 targetAccountId）
 */
export function isOutgoingTransfer(tx: TransactionType): boolean {
  return isOperateTransaction(tx) && tx.type === RootType.EXPENSE;
}

/**
 * 判斷是否為操作類交易的收款方（type = INCOME 且有 targetAccountId）
 */
export function isIncomingTransfer(tx: TransactionType): boolean {
  return isOperateTransaction(tx) && tx.type === RootType.INCOME;
}
