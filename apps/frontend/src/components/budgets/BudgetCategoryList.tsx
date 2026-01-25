'use client';

import { BudgetDetail, BudgetCategory } from '@/types/budget';
import { CategoryType } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { AddBudgetCategoryDialog } from './AddBudgetCategoryDialog';
import { EditBudgetCategoryDialog } from './EditBudgetCategoryDialog';
import { useState } from 'react';
import { budgetService } from '@/services/budget';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/ui/category-icon';

interface BudgetCategoryListProps {
  budget: BudgetDetail;
  allCategories: CategoryType[];
  onUpdate: () => void;
}

export function BudgetCategoryList({
  budget,
  allCategories,
  onUpdate,
}: BudgetCategoryListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(
    null,
  );

  // 輔助函式：根據 ID 獲取分類詳細資訊 (名稱、圖示等)
  const getCategoryDetails = (categoryId: string) => {
    return allCategories.find((c) => c.id === categoryId);
  };

  const handleAddCategory = async (categoryId: string, amount: number) => {
    try {
      // 呼叫 API 新增子預算
      const res = await budgetService.addBudgetCategory(budget.id, {
        categoryId,
        amount,
      });
      if (res.isSuccess) {
        toast.success('已新增子預算');
        onUpdate(); // 成功後觸發更新回調
      } else {
        toast.error('新增失敗');
      }
    } catch (e) {
      toast.error('新增失敗');
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    try {
      // 呼叫 API 移除子預算
      const res = await budgetService.removeBudgetCategory(
        budget.id,
        categoryId,
      );
      if (res.isSuccess) {
        toast.success('已移除子預算');
        onUpdate(); // 成功後觸發更新回調
      } else {
        toast.error('移除失敗');
      }
    } catch (e) {
      toast.error('移除失敗');
    }
  };

  const handleEditClick = (category: BudgetCategory) => {
    setEditingCategory(category);
  };

  const handleUpdateConfirm = async (amount: number, isExcluded: boolean) => {
    if (!editingCategory) return;

    try {
      const res = await budgetService.updateBudgetCategory(
        budget.id,
        editingCategory.id,
        {
          amount,
          isExcluded,
        },
      );
      if (res.isSuccess) {
        toast.success('已更新子預算');
        onUpdate();
        setEditingCategory(null);
      } else {
        toast.error('更新失敗');
      }
    } catch (e) {
      toast.error('更新失敗');
    }
  };

  const calculateMaxAmountForEdit = () => {
    if (!editingCategory) return 0;
    console.log('budget', budget);
    console.log('budget.budgetCategories', budget.budgetCategories);
    const totalAllocated = budget.budgetCategories.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );
    // 使用 available (累積預算: 基礎 + Rollover) 作為上限
    const maxBudget = budget.usage?.available ?? budget.amount;
    const unallocated = Math.max(0, maxBudget - totalAllocated);
    return unallocated + Number(editingCategory.amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">子預算 (分類配額)</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          新增子預算
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {budget.budgetCategories.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            尚無子預算設定
          </div>
        ) : (
          <div className="space-y-6">
            {budget.budgetCategories.map((bc) => {
              const category = getCategoryDetails(bc.categoryId);
              if (!category) return null;

              if (!category) return null;

              const { spent, percentage } = bc.usage || {
                spent: 0,
                percentage: 0,
              };

              return (
                <div
                  key={bc.id}
                  className="group relative flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <CategoryIcon
                        iconName={category.icon}
                        className="h-5 w-5"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {category.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {percentage}% Used
                        {bc.isExcluded && (
                          <span className="ml-2 text-xs bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded">
                            Hidden
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-base font-semibold text-foreground">
                        {formatCurrency(bc.amount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
                        onClick={() => handleEditClick(bc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveCategory(bc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar Background */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-xl overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        percentage > 100 ? 'bg-destructive' : 'bg-primary',
                      )}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AddBudgetCategoryDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onConfirm={handleAddCategory}
        categories={allCategories}
        existingCategoryIds={budget.budgetCategories.map((c) => c.categoryId)}
        maxAmount={Math.max(
          0,
          (budget.usage?.available ?? budget.amount) -
            budget.budgetCategories.reduce(
              (sum, c) => sum + Number(c.amount),
              0,
            ),
        )}
      />

      <EditBudgetCategoryDialog
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onConfirm={handleUpdateConfirm}
        category={
          editingCategory
            ? getCategoryDetails(editingCategory.categoryId)
            : undefined
        }
        currentAmount={editingCategory ? Number(editingCategory.amount) : 0}
        currentIsExcluded={editingCategory?.isExcluded ?? false}
        maxAmount={calculateMaxAmountForEdit()}
      />
    </Card>
  );
}
