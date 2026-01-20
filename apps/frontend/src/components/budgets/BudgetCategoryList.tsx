'use client';

import { BudgetDetail, BudgetCategory } from '@/types/budget';
import { CategoryType } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { AddBudgetCategoryDialog } from './AddBudgetCategoryDialog';
import { useState } from 'react';
import { budgetService } from '@/services/budget';
import { toast } from 'sonner';

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

  // 輔助函式：根據 ID 獲取分類詳細資訊 (名稱、圖示等)
  const getCategoryDetails = (categoryId: number) => {
    return allCategories.find((c) => Number(c.id) === categoryId);
  };

  const handleAddCategory = async (categoryId: number, amount: number) => {
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

  const handleRemoveCategory = async (categoryId: number) => {
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

  // 獲取子預算的使用量數據
  // 目前後端可能尚未完全實作子預算統計，此處暫時返回 0 或模擬數據
  const getUsage = (amount: number) => {
    // 實際應用中這裡應該來自後端的計算結果
    return { spent: 0, percentage: 0 };
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
        {budget.categories.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            尚無子預算設定
          </div>
        ) : (
          <div className="space-y-6">
            {budget.categories.map((bc) => {
              const category = getCategoryDetails(bc.categoryId);
              if (!category) return null;

              const { spent, percentage } = getUsage(bc.amount);

              return (
                <div key={bc.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* If icon is available */}
                      {category.icon && (
                        <span className="text-muted-foreground">
                          {category.icon}
                        </span>
                      )}
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(bc.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {percentage}%
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveCategory(bc.categoryId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
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
        existingCategoryIds={budget.categories.map((c) => c.categoryId)}
      />
    </Card>
  );
}
