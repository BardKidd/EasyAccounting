'use client';

import { useState } from 'react';
import type {
  BudgetMonthView,
  BudgetTargetType,
  BudgetTargetInfo,
} from '@repo/shared';
import { formatCurrency } from '@/lib/utils';
import { AssignedCell } from './AssignedCell';
import { AvailablePill } from './AvailablePill';
import { MoveMoneyPopover } from './MoveMoneyPopover';
import { TargetPopover } from './TargetPopover';
import { CategoryActivitySheet } from './CategoryActivitySheet';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ArrowUpRight, Target } from 'lucide-react';

/** 面向使用者的 target 摘要文案 */
function targetLabel(t: BudgetTargetInfo, fmt: (n: number) => string): string {
  if (t.type === 'SET_ASIDE') return `每月存 ${fmt(t.amount)}`;
  if (t.type === 'REFILL') return `補滿到 ${fmt(t.amount)}`;
  return `${t.dueDate?.slice(0, 7) ?? ''} 前存到 ${fmt(t.amount)}`;
}

interface BudgetTableProps {
  data: BudgetMonthView;
  /** YYYY-MM-01，給活動明細 Sheet 查交易用 */
  month: string;
  baseCurrencyCode: string;
  onAssign: (categoryId: string, assigned: number) => Promise<void>;
  onMove: (
    fromCategoryId: string | null,
    toCategoryId: string | null,
    amount: number,
  ) => Promise<void>;
  onUpsertTarget: (
    categoryId: string,
    data: { type: BudgetTargetType; amount: number; dueDate: string | null },
  ) => Promise<void>;
  onDeleteTarget: (categoryId: string) => Promise<void>;
}

const GRID_COLS =
  'grid grid-cols-[1fr_120px_120px_140px] md:grid-cols-[1fr_140px_140px_160px] gap-2 px-4 md:px-6';

export function BudgetTable({
  data,
  month,
  baseCurrencyCode,
  onAssign,
  onMove,
  onUpsertTarget,
  onDeleteTarget,
}: BudgetTableProps) {
  const fmt = (v: number) => formatCurrency(v, baseCurrencyCode);
  const [activityTarget, setActivityTarget] = useState<{
    categoryId: string;
    name: string;
  } | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg">
      {/* Header */}
      <div
        className={`${GRID_COLS} py-3 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200/50 dark:border-white/5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider`}
      >
        <span>分類</span>
        <span className="text-right">已分配</span>
        <span className="text-right">收支</span>
        <span className="text-right">可用</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {data.rows.map((row) => (
          <div
            key={row.categoryId}
            data-testid="budget-row"
            data-category-name={row.name}
            className={`${GRID_COLS} py-3 items-center hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors`}
          >
            {/* Category */}
            <div className="flex items-center gap-3 min-w-0">
              {row.icon && (
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{
                    backgroundColor: row.color ? `${row.color}20` : undefined,
                  }}
                >
                  <CategoryIcon iconName={row.icon} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {row.name}
                  </span>
                  <TargetPopover
                    row={row}
                    onUpsert={onUpsertTarget}
                    onDelete={onDeleteTarget}
                  >
                    <button
                      data-testid="target-trigger"
                      title="設定目標"
                      className={`shrink-0 rounded p-0.5 cursor-pointer transition-colors ${
                        row.target
                          ? 'text-emerald-500 hover:text-emerald-600'
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Target className="h-3.5 w-3.5" />
                    </button>
                  </TargetPopover>
                </div>
                {row.target && (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {targetLabel(row.target, fmt)}
                    {' · '}
                    {row.underfunded > 0 ? (
                      <button
                        data-testid="underfunded-fill"
                        onClick={() =>
                          onAssign(
                            row.categoryId,
                            row.assigned + row.underfunded,
                          )
                        }
                        className="text-amber-600 dark:text-amber-400 font-medium hover:underline cursor-pointer"
                      >
                        差 {fmt(row.underfunded)}
                      </button>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        已達標
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Assigned */}
            <div className="flex justify-end" data-testid="assigned-cell">
              <AssignedCell
                value={row.assigned}
                formatted={fmt(row.assigned)}
                onSubmit={(v) => onAssign(row.categoryId, v)}
              />
            </div>

            {/* Activity（點開明細 Sheet，spec §7） */}
            <div className="flex justify-end">
              <button
                data-testid="activity-cell"
                onClick={() =>
                  setActivityTarget({
                    categoryId: row.categoryId,
                    name: row.name,
                  })
                }
                className={`px-2 py-1 rounded-md text-sm tabular-nums hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                  row.activity < 0
                    ? 'text-red-600 dark:text-red-400'
                    : row.activity > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {fmt(row.activity)}
              </button>
            </div>

            {/* Available（點開搬錢 Popover，spec §7） */}
            <div className="flex justify-end">
              <MoveMoneyPopover
                rows={data.rows}
                currentCategoryId={row.categoryId}
                onMove={onMove}
              >
                <button
                  data-testid="available-cell"
                  className="cursor-pointer rounded-full transition-transform hover:scale-105"
                >
                  <AvailablePill
                    value={row.available}
                    formatted={fmt(row.available)}
                  />
                </button>
              </MoveMoneyPopover>
            </div>
          </div>
        ))}

        {/* Unclassified Transfer Out */}
        {data.unclassifiedTransferOut && (
          <div
            data-testid="unclassified-row"
            className={`${GRID_COLS} py-3 items-center bg-slate-50/30 dark:bg-slate-800/20`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-slate-700/50">
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
                轉出（未分類）
              </span>
            </div>
            <div /> {/* no assigned */}
            <div className="text-right text-sm tabular-nums text-red-600 dark:text-red-400">
              {fmt(data.unclassifiedTransferOut.activity)}
            </div>
            <div className="flex justify-end">
              <AvailablePill
                value={data.unclassifiedTransferOut.available}
                formatted={fmt(data.unclassifiedTransferOut.available)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      <div
        className={`${GRID_COLS} py-3 bg-slate-50/80 dark:bg-slate-800/30 border-t border-slate-200/50 dark:border-white/5 text-sm font-semibold`}
      >
        <span className="text-slate-600 dark:text-slate-300">合計</span>
        <span className="text-right tabular-nums text-slate-700 dark:text-slate-200">
          {fmt(data.totals.assigned)}
        </span>
        <span
          className={`text-right tabular-nums ${
            data.totals.activity < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {fmt(data.totals.activity)}
        </span>
        <span className="text-right tabular-nums text-slate-700 dark:text-slate-200">
          {fmt(data.totals.available)}
        </span>
      </div>

      {/* Activity 明細 Sheet */}
      <CategoryActivitySheet
        open={activityTarget !== null}
        onOpenChange={(o) => !o && setActivityTarget(null)}
        categoryId={activityTarget?.categoryId ?? null}
        categoryName={activityTarget?.name ?? ''}
        month={month}
        baseCurrencyCode={baseCurrencyCode}
      />
    </div>
  );
}
