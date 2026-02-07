'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Budget, BudgetUsage, BudgetCycleType } from '@/types/budget';
import { formatCurrency, cn } from '@/lib/utils';
import { getDaysRemaining } from '@/lib/budget-utils';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BudgetCardProps {
  budget: Budget;
  usage: BudgetUsage;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

export function BudgetCard({
  budget,
  usage,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const router = useRouter();
  const { usageRate, spent, remaining, available } = usage;

  let statusColor = 'bg-emerald-500';
  let textColor = 'text-emerald-600 dark:text-emerald-400';

  // 計算使用率顏色邏輯：
  // >= 100% : 紅色 (警告)
  // >= 80%  : 橘色 (注意)
  // 其他    : 綠色 (正常)
  if (usageRate >= 100) {
    statusColor = 'bg-destructive';
    textColor = 'text-destructive';
  } else if (usageRate >= 80) {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-600 dark:text-amber-400';
  }

  // 根據週期類型顯示對應的文字描述
  const getCycleText = () => {
    switch (budget.cycleType) {
      case BudgetCycleType.MONTH:
        return `每月 ${budget.cycleStartDay} 日重置`;
      case BudgetCycleType.YEAR:
        return '年度預算';
      case BudgetCycleType.WEEK:
        return '每週重置';
      case BudgetCycleType.DAY:
        return '每日重置';
      default:
        return '';
    }
  };

  // 處理重新計算中的 loading 狀態
  // 當後端正在重新計算歷史數據時顯示此區塊
  if (budget.isRecalculating) {
    return (
      <Card className="w-full opacity-80">
        <CardHeader className="pb-2">
          <div className="space-y-2">
            <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
            <AlertTriangle className="mb-2 h-8 w-8 animate-bounce text-primary" />
            正在重新計算歷史資料...
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCardClick = () => {
    router.push(`/budgets/${budget.id}`);
  };

  return (
    <div className="group relative w-full rounded-xl transition-all hover:shadow-lg">
      <Card
        className="w-full cursor-pointer transition-colors group-hover:border-primary/50"
        onClick={handleCardClick}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              {budget.name}
            </CardTitle>
            <CardDescription>{getCycleText()}</CardDescription>
          </div>
          <div
            className="flex gap-2 relative z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(budget);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(budget.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <span className="text-2xl font-bold">
                {formatCurrency(spent)}
              </span>
              <span className="text-muted-foreground ml-1 text-sm">
                / {formatCurrency(available)}
              </span>
            </div>
            <div className={cn('font-medium', textColor)}>
              {usageRate.toFixed(1)}%
            </div>
          </div>
          <div className="relative">
            <Progress
              value={Math.min(usageRate, 100)}
              className={cn(
                'h-2 *:data-[slot=progress-indicator]:transition-all',
                `*:data-[slot=progress-indicator]:${statusColor}`,
              )}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <div className="flex gap-2">
              <span>剩餘 {formatCurrency(remaining)}</span>
              <span>•</span>
              <span>還有 {getDaysRemaining(budget)} 天</span>
            </div>
            {budget.pendingAmount && (
              <span className="flex items-center text-amber-600">
                <AlertTriangle className="mr-1 h-3 w-3" />
                下期變更為 {formatCurrency(budget.pendingAmount)}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter>{/* Optional: Add more details or actions */}</CardFooter>
      </Card>

      {/* Hover Hint Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/5 opacity-0 backdrop-blur-[1px] transition-all duration-300 group-hover:opacity-100 cursor-pointer"
        onClick={handleCardClick}
      >
        <span className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-border">
          管理子預算
        </span>
      </div>
    </div>
  );
}
