'use client';

import type { CreditCardPaymentRow } from '@repo/shared';
import { formatCurrency } from '@/lib/utils';
import { AssignedCell } from './AssignedCell';
import { AvailablePill } from './AvailablePill';
import { CreditCard } from 'lucide-react';

const GRID_COLS =
  'grid grid-cols-[1fr_120px_120px_140px] md:grid-cols-[1fr_140px_140px_160px] gap-2 px-4 md:px-6';

interface CreditCardPaymentSectionProps {
  rows: CreditCardPaymentRow[];
  baseCurrencyCode: string;
  /** 撥備（assign）至某卡的 CC Payment 信封 */
  onAssign: (accountId: string, assigned: number) => Promise<void>;
}

export function CreditCardPaymentSection({
  rows,
  baseCurrencyCode,
  onAssign,
}: CreditCardPaymentSectionProps) {
  if (rows.length === 0) return null;
  const fmt = (v: number) => formatCurrency(v, baseCurrencyCode);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg">
      {/* Header */}
      <div
        className={`${GRID_COLS} py-3 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200/50 dark:border-white/5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider`}
      >
        <span>信用卡付款</span>
        <span className="text-right">撥備</span>
        <span className="text-right">收支</span>
        <span className="text-right">可付</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {rows.map((row) => (
          <div
            key={row.accountId}
            data-testid="cc-payment-row"
            data-card-name={row.name}
            className={`${GRID_COLS} py-3 items-center hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors`}
          >
            {/* Card */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-indigo-500/10">
                <CreditCard className="h-4 w-4 text-indigo-500" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {row.name}
              </span>
              {row.isDebt && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400">
                  卡債
                </span>
              )}
            </div>

            {/* Assigned（撥備） */}
            <div className="flex justify-end" data-testid="cc-assigned-cell">
              <AssignedCell
                value={row.assigned}
                formatted={fmt(row.assigned)}
                onSubmit={(v) => onAssign(row.accountId, v)}
              />
            </div>

            {/* Activity */}
            <div
              className={`text-right text-sm tabular-nums px-2 py-1 ${
                row.activity < 0
                  ? 'text-red-600 dark:text-red-400'
                  : row.activity > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {fmt(row.activity)}
            </div>

            {/* Available（可付） */}
            <div className="flex justify-end" data-testid="available-cell">
              <AvailablePill
                value={row.available}
                formatted={fmt(row.available)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
