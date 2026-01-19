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
import { Edit, Trash2, AlertTriangle } from 'lucide-react';

interface BudgetCardProps {
  budget: Budget;
  usage: BudgetUsage;
  onEdit: (budget: Budget) => void;
  onDelete: (id: number) => void;
}

export function BudgetCard({
  budget,
  usage,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const { usageRate, spent, remaining, available } = usage;

  let statusColor = 'bg-green-500';
  let textColor = 'text-green-600';

  if (usageRate >= 100) {
    statusColor = 'bg-red-500';
    textColor = 'text-red-600';
  } else if (usageRate >= 80) {
    statusColor = 'bg-orange-500';
    textColor = 'text-orange-600';
  }

  // Calculate cycle text
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

  if (budget.isRecalculating) {
    return (
      <Card className="w-full opacity-80">
        <CardHeader className="pb-2">
            <div className="space-y-2">
                <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
                <AlertTriangle className="mb-2 h-8 w-8 animate-bounce text-amber-500" />
                正在重新計算歷史資料...
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            {budget.name}
          </CardTitle>
          <CardDescription>{getCycleText()}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(budget)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(budget.id)}
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
          <div className={cn("font-medium", textColor)}>
            {usageRate.toFixed(1)}%
          </div>
        </div>
        <div className="relative">
             <Progress 
                value={Math.min(usageRate, 100)} 
                className={cn("h-2 [&>[data-slot=progress-indicator]]:transition-all", 
                    `[&>[data-slot=progress-indicator]]:${statusColor}`
                )}
            />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>剩餘 {formatCurrency(remaining)}</span>
          {budget.pendingAmount && (
             <span className="flex items-center text-amber-600">
                <AlertTriangle className="mr-1 h-3 w-3" />
                下期變更為 {formatCurrency(budget.pendingAmount)}
             </span>
          )}
        </div>
      </CardContent>
      <CardFooter>
         {/* Optional: Add more details or actions */}
      </CardFooter>
    </Card>
  );
}
