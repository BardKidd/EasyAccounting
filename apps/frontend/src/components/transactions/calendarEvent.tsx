'use client';

import { RootType, TransactionType } from '@repo/shared';
import { isOutgoingTransfer } from '@repo/shared';
import { calculateNetAmount, formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { CategoryType } from '@repo/shared';
import {
  TRANSACTION_COLORS,
  getTransactionContainerClass,
} from '@/lib/transactionColors';

interface CalendarEventProps {
  event: {
    resource: TransactionType;
    title: string;
    amount: number;
    type: RootType;
    isTransfer: boolean;
  };
  categories: CategoryType[];
}

export function CalendarEvent({ event, categories }: CalendarEventProps) {
  const { type, isTransfer, amount, resource } = event;

  // Find category for icon
  const findCategory = (
    id: string,
    categoryList: CategoryType[],
  ): CategoryType | null => {
    for (const category of categoryList) {
      if (category.id === id) return category;
      if (category.children && category.children.length > 0) {
        const found = findCategory(id, category.children);
        if (found) return found;
      }
    }
    return null;
  };

  const category = findCategory(resource.categoryId, categories);

  // 使用統一顏色常數
  const getColorType = (): 'income' | 'expense' | 'transfer' | 'default' => {
    if (isTransfer) return 'transfer';
    if (type === RootType.EXPENSE) return 'expense';
    if (type === RootType.INCOME) return 'income';
    return 'default';
  };

  const containerClass = getTransactionContainerClass(getColorType());
  const netAmount = calculateNetAmount(resource);
  const formattedAmount = formatCurrency(Math.abs(netAmount));

  return (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1 mx-0.5 my-0.5 rounded-md text-xs ${containerClass} transition-all duration-200 hover:brightness-95 dark:hover:brightness-110 cursor-pointer`}
    >
      <div
        className={`shrink-0 opacity-75 group-hover:opacity-100 transition-opacity`}
      >
        <CategoryIcon iconName={category?.icon} className="h-3.5 w-3.5" />
      </div>
      <span className="truncate font-medium flex-1">{event.title}</span>
      <span
        className={`font-mono tabular-nums text-[10px] opacity-90 font-bold`}
      >
        {isTransfer ? '' : type === RootType.EXPENSE ? '-' : '+'}{formattedAmount}
      </span>
    </div>
  );
}
