'use client';

import { AlertTriangle } from 'lucide-react';

export function OverspendingBanner() {
  return (
    <div
      data-testid="overspending-banner"
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="text-sm">
        本月有分類超支。月底負值將歸零，差額從下月可分配金額扣除。
      </p>
    </div>
  );
}
