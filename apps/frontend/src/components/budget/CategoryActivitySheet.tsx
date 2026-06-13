'use client';

import useSWR from 'swr';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getTransactions } from '@/services/transaction';
import { getCategories } from '@/services/category';
import { getPersonnelAccounts } from '@/services/personnelAccount';
import { formatCurrency } from '@/lib/utils';
import { RootType } from '@repo/shared';
import type { CategoryType, TransactionType } from '@repo/shared';
import { Receipt } from 'lucide-react';

/**
 * 單筆交易計入 activity 的金額，對齊後端聚合公式：
 * amountInBase + extraMinusInBase − extraAddInBase（含手續費/折扣）。
 * 否則合計會與表格的 Activity 數字不一致（budget-ynab review L1）。
 */
function txActivityAmount(t: TransactionType): number {
  const base = Number(t.amountInBase ?? t.amount);
  const extraMinus = Number(t.transactionExtra?.extraMinusInBase ?? 0);
  const extraAdd = Number(t.transactionExtra?.extraAddInBase ?? 0);
  return base + extraMinus - extraAdd;
}

/** 月末日期（手動格式化，避免 toISOString 時區偏移） */
function endOfMonth(monthStr: string): string {
  const parts = monthStr.split('-').map(Number);
  const lastDay = new Date(parts[0]!, parts[1]!, 0).getDate();
  return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function formatMonthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return `${y} 年 ${mo} 月`;
}

interface CategoryActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Main 信封分類 id（null = 未選） */
  categoryId: string | null;
  categoryName: string;
  /** YYYY-MM-01 */
  month: string;
  baseCurrencyCode: string;
}

export function CategoryActivitySheet({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  month,
  baseCurrencyCode,
}: CategoryActivitySheetProps) {
  // 既有 transactions API 只支援精確 categoryId 過濾，而信封是 Main 層
  // （交易可能掛 Sub 層），故抓整月支出後在客端做 Main roll-up 過濾
  const { data: transactions, isLoading } = useSWR(
    open && categoryId ? ['/budget/activity', categoryId, month] : null,
    async ([, cid, m]: [string, string, string]) => {
      const [txResp, categories, accounts] = await Promise.all([
        getTransactions({
          startDate: m,
          endDate: endOfMonth(m),
          type: RootType.EXPENSE,
          limit: 1000,
        }),
        getCategories() as Promise<CategoryType[]>,
        getPersonnelAccounts(),
      ]);
      const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));
      // 只保留 on-budget 帳戶的交易——後端 activity 聚合限定 onBudget=true，
      // 否則 tracking 帳戶掛同分類的支出會讓明細與 Activity 數字對不上（M6）
      const onBudgetIds = new Set(
        accounts.filter((a) => a.onBudget).map((a) => a.id),
      );
      return txResp.items.filter(
        (t: TransactionType) =>
          onBudgetIds.has(t.accountId) &&
          (t.categoryId === cid || parentOf.get(t.categoryId) === cid),
      );
    },
    { revalidateOnFocus: false },
  );

  const fmt = (v: number) => formatCurrency(v, baseCurrencyCode);
  const total = (transactions ?? []).reduce(
    (sum, t) => sum + txActivityAmount(t),
    0,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="text-slate-800 dark:text-slate-100">
            {categoryName} · 交易明細
          </SheetTitle>
          <SheetDescription>
            {formatMonthLabel(month)}的支出交易（含子分類）
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* 合計 */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              本月合計
            </span>
            <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
              −{fmt(total)}
            </span>
          </div>

          {/* 明細列表 */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <Receipt className="h-8 w-8" />
              <p className="text-sm">本月此分類沒有交易</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200/50 dark:border-white/10">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {t.description || '（無描述）'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t.date}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-red-600 dark:text-red-400 shrink-0 pl-3">
                    −{fmt(txActivityAmount(t))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
