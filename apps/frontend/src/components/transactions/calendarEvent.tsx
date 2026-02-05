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

  let bgColor = 'bg-slate-100';
  let textColor = 'text-slate-700';
  let borderColor = 'border-slate-200';

  if (isTransfer) {
    // Operate / Transfer
    bgColor = 'bg-amber-100 dark:bg-amber-500/10';
    textColor = 'text-amber-700 dark:text-amber-400';
    borderColor = 'border-amber-200 dark:border-amber-500/20';
  } else if (type === RootType.EXPENSE) {
    // Expense
    bgColor = 'bg-rose-100 dark:bg-rose-500/10';
    textColor = 'text-rose-700 dark:text-rose-400';
    borderColor = 'border-rose-200 dark:border-rose-500/20';
  } else if (type === RootType.INCOME) {
    // Income
    bgColor = 'bg-emerald-100 dark:bg-emerald-500/10';
    textColor = 'text-emerald-700 dark:text-emerald-400';
    borderColor = 'border-emerald-200 dark:border-emerald-500/20';
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-xs border-l-2 truncate ${bgColor} ${textColor} ${borderColor}`}
    >
        <div className="shrink-0">
             <CategoryIcon iconName={category?.icon} className="h-3 w-3" />
        </div>
      <span className="truncate font-medium">{event.title}</span>
      <span className="font-mono ml-auto tabular-nums opacity-90">
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
