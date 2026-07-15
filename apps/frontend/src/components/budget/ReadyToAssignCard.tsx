'use client';

import type { BudgetRTABreakdown } from '@repo/shared';
import { formatCurrency } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Info } from 'lucide-react';

interface ReadyToAssignCardProps {
  readyToAssign: number;
  rtaBreakdown: BudgetRTABreakdown;
  baseCurrencyCode: string;
}

export function ReadyToAssignCard({
  readyToAssign,
  rtaBreakdown,
  baseCurrencyCode,
}: ReadyToAssignCardProps) {
  const isNegative = readyToAssign < 0;
  const isZero = readyToAssign === 0;
  const fmt = (v: number) => formatCurrency(v, baseCurrencyCode);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 shadow-lg border transition-all duration-300 ${
        isNegative
          ? 'bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-200/50 dark:border-red-500/20'
          : isZero
            ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-200/50 dark:border-emerald-500/20'
            : 'bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-200/50 dark:border-blue-500/20'
      }`}
    >
      {/* Background glow */}
      <div
        className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 ${
          isNegative ? 'bg-red-400' : isZero ? 'bg-emerald-400' : 'bg-blue-400'
        }`}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide">
            可分配金額
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                data-testid="rta-info"
                className="p-2 md:p-1 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Info className="h-4 w-4 text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 p-4 space-y-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/10"
            >
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                RTA 組成
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">起始餘額</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {fmt(rtaBreakdown.startingBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">累計收入</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    +{fmt(rtaBreakdown.cumulativeInflow)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">累計已分配</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    −{fmt(rtaBreakdown.cumulativeAssigned)}
                  </span>
                </div>
                {rtaBreakdown.priorOverspending !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      前月超支扣除
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {fmt(rtaBreakdown.priorOverspending)}
                    </span>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div
          data-testid="rta-amount"
          className={`text-4xl font-bold font-outfit tracking-tight ${
            isNegative
              ? 'text-red-600 dark:text-red-400'
              : isZero
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          {fmt(readyToAssign)}
        </div>

        {isZero && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            ✨ 每一分錢都有歸屬了！
          </p>
        )}
        {isNegative && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
            ⚠️ 您分配的金額超過可用資金
          </p>
        )}
      </div>
    </div>
  );
}
