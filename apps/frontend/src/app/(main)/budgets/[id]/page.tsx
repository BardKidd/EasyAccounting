'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { budgetService } from '@/services/mock/budgetMock';
import { getCategories } from '@/services/category';
import { BudgetDetail } from '@/types/budget';
import { CategoryType } from '@repo/shared';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetCategoryList } from '@/components/budgets/BudgetCategoryList';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import { BudgetFormModal } from '@/components/budgets/BudgetFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  // Unwrap params using React.use() or await if explicit.
  // Since this is a client component, Next.js passes the promise.
  // Actually, for client components in App Router, params is a Promise in newer versions.
  // We can use the 'use' hook if we were using it in a way that suspends,
  // but a simpler way for standard fetching is useEffect.
  // However, extracting id from params needs handling.

  // A safe way in client components is to use `useParams` hook from `next/navigation`
  // instead of props if we want to avoid async props issues in client components.
  // Let's use `useParams`.
  // Wait, I can just use useParams() hook.

  return <BudgetDetailContent />;
}

import { useParams } from 'next/navigation';

function BudgetDetailContent() {
  // 使用 useParams 獲取動態路由參數 (id)
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();

  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetRes, catData] = await Promise.all([
        budgetService.getBudgetById(id),
        getCategories().catch((e) => {
          console.warn('Failed to fetch categories', e);
          return [
            {
              id: 1,
              name: '餐飲',
              icon: 'utensils',
              color: '#ff0000',
              type: 'EXPENSE',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 2,
              name: '交通',
              icon: 'car',
              color: '#00ff00',
              type: 'EXPENSE',
              createdAt: '',
              updatedAt: '',
            },
          ] as any;
        }),
      ]);

      if (budgetRes.isSuccess) {
        setBudget(budgetRes.data);
      } else {
        toast.error('找不到預算');
        router.push('/budgets');
      }

      setCategories(catData);
    } catch (error) {
      toast.error('載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleDelete = async () => {
    try {
      await budgetService.deleteBudget(id);
      toast.success('刪除成功');
      router.push('/budgets');
    } catch (e) {
      toast.error('刪除失敗');
    }
  };

  if (loading) {
    return (
      <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </Container>
    );
  }

  if (!budget) return null;

  const { usage } = budget;
  let statusColor = 'bg-green-500';
  let textColor = 'text-green-600';
  if (usage.usageRate >= 100) {
    statusColor = 'bg-red-500';
    textColor = 'text-red-600';
  } else if (usage.usageRate >= 80) {
    statusColor = 'bg-orange-500';
    textColor = 'text-orange-600';
  }

  return (
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/budgets')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{budget.name}</h2>
            <p className="text-sm text-muted-foreground">
              {budget.description || '無備註'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            編輯預算
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            刪除預算
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 預算概況卡片 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>預算概況</CardTitle>
            <CardDescription>
              {budget.cycleType === 'MONTH' ? '每月預算' : '預算週期'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-4">
              <div className="text-4xl font-bold mb-2">
                {formatCurrency(usage.spent)}
              </div>
              <div className="text-sm text-muted-foreground">
                已支出 / 預算 {formatCurrency(usage.available)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>使用率</span>
                <span className={textColor}>{usage.usageRate.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(usage.usageRate, 100)}
                className={cn(
                  'h-3',
                  `[&>[data-slot=progress-indicator]]:${statusColor}`,
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <div className="text-sm text-muted-foreground">剩餘額度</div>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-200">
                  {formatCurrency(usage.remaining)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">週期結束</div>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-200">
                  {/* Add logic to calculate remaining days if needed */}
                  -- 天
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 子預算列表區域 */}
        <div className="lg:col-span-2">
          <BudgetCategoryList
            budget={budget}
            allCategories={categories}
            onUpdate={fetchData}
          />
        </div>
      </div>

      <BudgetFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchData}
        initialData={budget}
        categories={categories}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此預算嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此動作無法復原。這將永久刪除您的預算設定及相關歷史紀錄。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
