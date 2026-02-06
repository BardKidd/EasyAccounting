/**
 * 統一的交易顏色常數定義
 * 用於日曆、列表、Modal 等元件，確保顏色一致性
 */

export const TRANSACTION_COLORS = {
  income: {
    bg: 'bg-teal-100',
    bgDark: 'dark:bg-teal-900/40',
    text: 'text-teal-800',
    textDark: 'dark:text-teal-200',
    icon: 'text-teal-600',
    iconDark: 'dark:text-teal-400',
  },
  expense: {
    bg: 'bg-rose-100',
    bgDark: 'dark:bg-rose-950/50',
    text: 'text-rose-800',
    textDark: 'dark:text-rose-200',
    icon: 'text-rose-600',
    iconDark: 'dark:text-rose-400',
  },
  transfer: {
    bg: 'bg-amber-100',
    bgDark: 'dark:bg-amber-900/40',
    text: 'text-amber-900',
    textDark: 'dark:text-amber-100',
    icon: 'text-amber-600',
    iconDark: 'dark:text-amber-400',
  },
  default: {
    bg: 'bg-slate-100',
    bgDark: 'dark:bg-slate-800',
    text: 'text-slate-700',
    textDark: 'dark:text-slate-300',
    icon: 'text-slate-600',
    iconDark: 'dark:text-slate-400',
  },
} as const;

export type TransactionColorKey = keyof typeof TRANSACTION_COLORS;

/**
 * 取得完整的容器樣式 class
 */
export function getTransactionContainerClass(
  type: 'income' | 'expense' | 'transfer' | 'default',
): string {
  const colors = TRANSACTION_COLORS[type];
  return `${colors.bg} ${colors.text} ${colors.bgDark} ${colors.textDark}`;
}

/**
 * 取得 icon 樣式 class
 */
export function getTransactionIconClass(
  type: 'income' | 'expense' | 'transfer' | 'default',
): string {
  const colors = TRANSACTION_COLORS[type];
  return `${colors.icon} ${colors.iconDark}`;
}
