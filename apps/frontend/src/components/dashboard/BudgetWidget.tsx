'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { useEffect, useState } from 'react';
import { Budget, BudgetDetail } from '@/types/budget';
import { budgetService } from '@/services/budget';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function BudgetWidget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [details, setDetails] = useState<Record<string, BudgetDetail>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const res = await budgetService.getBudgets();
        if (res.isSuccess) {
          // Take top 3 active budgets
          const activeBudgets = res.data.filter((b) => b.isActive).slice(0, 3);
          setBudgets(activeBudgets);

          const detailPromises = activeBudgets.map((b) =>
            budgetService.getBudgetById(b.id),
          );
          const detailsRes = await Promise.all(detailPromises);
          const detailsMap: Record<string, BudgetDetail> = {};
          detailsRes.forEach((d) => {
            if (d.isSuccess) {
              detailsMap[d.data.id] = d.data;
            }
          });
          setDetails(detailsMap);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-4">
        <CardHeader>
          <CardTitle>預算概況</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-4">
        <CardHeader>
          <CardTitle>預算概況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
            尚無預算設定
            <Button variant="link" asChild className="mt-2">
              <Link href="/budgets">立即建立</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-4 h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>預算概況</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/budgets">
            查看全部 <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((budget) => {
          const detail = details[budget.id];
          const usage = detail?.usage || {
            spent: 0,
            available: budget.amount,
            remaining: budget.amount,
            usageRate: 0,
          };
          return (
            <BudgetCard
              key={budget.id}
              budget={budget}
              usage={usage}
              onEdit={() => {}} // Widget doesn't support edit
              onDelete={() => {}}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
