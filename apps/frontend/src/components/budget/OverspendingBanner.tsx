'use client';

import { AlertTriangle } from 'lucide-react';

interface OverspendingBannerProps {
  /** cash：超支自下月 RTA 扣除；credit：刷卡超支累積卡債不扣 RTA；both：兩者皆有（Phase 2 ④） */
  kind?: 'cash' | 'credit' | 'both';
}

export function OverspendingBanner({ kind = 'cash' }: OverspendingBannerProps) {
  const showCash = kind === 'cash' || kind === 'both';
  const showCredit = kind === 'credit' || kind === 'both';
  return (
    <div
      data-testid="overspending-banner"
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="text-sm space-y-1">
        {showCash && (
          <p>本月有現金超支。月底負值將歸零，差額從下月可分配金額扣除。</p>
        )}
        {showCredit && (
          <p>
            本月有信用卡超支（刷卡超出信封）。將累積為卡債、月底不扣可分配金額，請撥備款項至「信用卡付款」信封。
          </p>
        )}
      </div>
    </div>
  );
}
