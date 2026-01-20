'use client';

import { useEffect, useState } from 'react';
import { budgetService } from '@/services/mock/budgetMock';
import { Budget, BudgetDetail } from '@/types/budget';
import { BudgetCard } from './BudgetCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BudgetDashboardWidget() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [details, setDetails] = useState<Record<number, BudgetDetail>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const res = await budgetService.getBudgets();
        if (res.isSuccess) {
          const activeBudgets = res.data.filter(b => b.isActive).slice(0, 3); // Show max 3
          setBudgets(activeBudgets);
          
          const detailPromises = activeBudgets.map(b => budgetService.getBudgetById(b.id));
          const detailsRes = await Promise.all(detailPromises);
          const detailsMap: Record<number, BudgetDetail> = {};
          detailsRes.forEach(d => {
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
    return <Skeleton className="h-[250px] w-full rounded-xl" />;
  }

  if (budgets.length === 0) {
      return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>預算監控</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <p>尚無預算設定</p>
                <Button variant="link" asChild className="mt-2">
                    <Link href="/budgets">前往設定</Link>
                </Button>
            </CardContent>
        </Card>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-playfair text-slate-900 dark:text-slate-50">預算監控</h3>
        <Button variant="ghost" size="sm" asChild>
            <Link href="/budgets" className="flex items-center">
                查看全部 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => {
             const detail = details[budget.id];
             const usage = detail?.usage || { spent: 0, available: budget.amount, remaining: budget.amount, usageRate: 0 };
             return (
                 <div key={budget.id} onClick={() => router.push(`/budgets/${budget.id}`)} className="cursor-pointer transition-transform hover:scale-[1.01]">
                    <BudgetCard
                        budget={budget}
                        usage={usage}
                        onEdit={() => router.push('/budgets')} // Redirect to main page for edit in modal
                        onDelete={() => {}} // Disable delete from widget
                    />
                 </div>
             );
        })}
      </div>
    </div>
  );
}
