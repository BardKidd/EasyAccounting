'use client';

import { RootType, TransactionType } from '@repo/shared';
import { isOutgoingTransfer } from '@repo/shared';
import { calculateNetAmount, formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { CategoryType } from '@repo/shared';

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

  let containerClass =
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let amountClass = 'font-semibold';

  if (isTransfer) {
    containerClass =
      'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100';
  } else if (type === RootType.EXPENSE) {
    containerClass =
      'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200';
  } else if (type === RootType.INCOME) {
    containerClass =
      'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200';
  }

  return (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1 mx-0.5 my-0.5 rounded-md text-xs ${containerClass} transition-all duration-200 hover:brightness-95 dark:hover:brightness-110 cursor-pointer`}
    >
      <div
        className={`shrink-0 opacity-75 group-hover:opacity-100 transition-opacity`}
      >
        <CategoryIcon iconName={category?.icon} className="h-3 w-3" />
      </div>
      <span className="truncate font-medium flex-1">{event.title}</span>
      <span
        className={`font-mono tabular-nums text-[10px] opacity-90 ${amountClass}`}
      >
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
