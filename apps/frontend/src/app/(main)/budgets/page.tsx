'use client';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetFormModal } from '@/components/budgets/BudgetFormModal';
import { useEffect, useState } from 'react';
import { budgetService } from '@/services/mock/budgetMock';
import { Budget, BudgetDetail } from '@/types/budget';
import { CategoryType } from '@repo/shared';
import { getCategories } from '@/services/category';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Record<number, BudgetDetail>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(
    undefined,
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Budgets
      const budgetRes = await budgetService.getBudgets();
      if (budgetRes.isSuccess) {
        setBudgets(budgetRes.data);

        // Fetch details for each to get usage
        // In real world we might have a list endpoint with usage, but here we mock getBudgetById
        const detailPromises = budgetRes.data.map((b) =>
          budgetService.getBudgetById(b.id),
        );
        const detailsRes = await Promise.all(detailPromises);
        const detailsMap: Record<number, BudgetDetail> = {};
        detailsRes.forEach((d) => {
          if (d.isSuccess) {
            detailsMap[d.data.id] = d.data;
          }
        });
        setDetails(detailsMap);
      }

      // Fetch Categories
      try {
        const catData = await getCategories();
        setCategories(catData);
      } catch (e) {
        console.warn('Failed to fetch categories, using mock', e);
        // Mock fallback
        setCategories([
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
          {
            id: 3,
            name: '娛樂',
            icon: 'gamepad',
            color: '#0000ff',
            type: 'EXPENSE',
            createdAt: '',
            updatedAt: '',
          },
        ] as any);
      }
    } catch (error) {
      toast.error('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await budgetService.deleteBudget(deleteId);
        toast.success('刪除成功');
        fetchData();
      } catch (error) {
        toast.error('刪除失敗');
      } finally {
        setDeleteId(null);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBudget(undefined);
  };

  return (
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/60 bg-clip-text text-transparent font-playfair">
            預算管理
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            設定您的預算計畫，有效控制支出
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer bg-slate-900 dark:bg-slate-50 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-xl shadow-slate-300/50 dark:shadow-none border-0 transition-all duration-300 transform hover:scale-105 rounded-full px-6 h-11 text-sm font-medium font-playfair tracking-wide"
        >
          <Plus className="mr-2 h-4 w-4" />
          建立預算
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const detail = details[budget.id];
            // Safe fallback if detail missing (shouldn't happen with correct mock)
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
                onEdit={handleEdit}
                onDelete={setDeleteId}
              />
            );
          })}
        </div>
      )}

      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={fetchData}
        initialData={editingBudget}
        categories={categories}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
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
              onClick={confirmDelete}
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
