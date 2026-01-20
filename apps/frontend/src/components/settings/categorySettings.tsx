'use client';

import { useMemo, useState } from 'react';
import { CategoryType, RootType } from '@repo/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import service from '@/services';
import { useRouter } from 'next/navigation';

import { CategoryDialog } from './categoryDialog';
import { DeleteConfirmDialog } from './deleteConfirmDialog';
import { CategoryTreeItem } from './categoryTreeItem';
import { ExtendedCategoryType, CategoryDialogMode } from './types';

interface CategorySettingsProps {
  categories: CategoryType[];
}

export function CategorySettings({ categories }: CategorySettingsProps) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    mode: CategoryDialogMode;
    type: string;
    node: ExtendedCategoryType | null;
  }>({
    isOpen: false,
    mode: CategoryDialogMode.ADD_MAIN,
    type: RootType.EXPENSE,
    node: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    node?: ExtendedCategoryType | null;
  }>({
    isOpen: false,
    node: null,
  });

  const router = useRouter();

  const mapCategories = (
    cats: CategoryType[],
    isTopLevel: boolean,
    isIncome: boolean = false,
  ): ExtendedCategoryType[] => {
    return cats.map((c) => {
      let isMain = isTopLevel;
      // Income 的特殊邏輯，只有自定義的類別(有 userId) 或 '其他' 才可以展開
      if (isIncome && isTopLevel) {
        const isCustom = !!c.userId;
        const isOther = c.name === '其他';
        isMain = isCustom || isOther;
      }

      return {
        ...c,
        isMainCategory: isMain,
      };
    });
  };

  // 因為 UI 殼已經有寫收支類別，因此先排除 rootCategory 後再接著顯示
  const incomeTree = mapCategories(
    categories.filter((c) => c.type === RootType.INCOME)[0]?.children || [],
    true,
    true,
  );
  const expenseTree = mapCategories(
    categories.filter((c) => c.type === RootType.EXPENSE)[0]?.children || [],
    true,
    false,
  );

  // rootCategory，在新增 mainCategory 時需要
  const rootIncomeCategory = categories.filter(
    (c) => c.type === RootType.INCOME,
  )[0];
  const rootExpenseCategory = categories.filter(
    (c) => c.type === RootType.EXPENSE,
  )[0];

  const handleAddMain = (type: string) => {
    setDialogState({
      isOpen: true,
      mode: CategoryDialogMode.ADD_MAIN,
      type,
      node: null,
    });
  };

  const handleAddSub = (node: ExtendedCategoryType) => {
    setDialogState({
      isOpen: true,
      mode: CategoryDialogMode.ADD_SUB,
      type: node.type,
      node,
    });
  };

  const handleEdit = (node: ExtendedCategoryType) => {
    setDialogState({
      isOpen: true,
      mode: CategoryDialogMode.EDIT,
      type: node.type,
      node,
    });
  };

  const handleDelete = (node: ExtendedCategoryType) => {
    setDeleteDialogState({ isOpen: true, node });
  };

  const executeDelete = async () => {
    if (!deleteDialogState.node) return;
    try {
      const res = await service.deleteCategory(deleteDialogState.node.id);
      if (res.isSuccess) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(getErrorMessage(res.error));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteDialogState({ isOpen: false, node: null });
    }
  };

  const decidedParentId = useMemo(() => {
    if (dialogState.mode === CategoryDialogMode.ADD_SUB) {
      if (!dialogState.node) {
        toast.error('發生錯誤，無法找尋 SubCategory 的父類別');
        return null;
      }
      return dialogState.node.id;
    } else if (dialogState.mode === CategoryDialogMode.EDIT) {
      // mainCategory 編輯狀態
      if (dialogState.node?.parentId === rootIncomeCategory.id) {
        return rootIncomeCategory.id;
      } else if (dialogState.node?.parentId === rootExpenseCategory.id) {
        return rootExpenseCategory.id;
      }
      // subCategory 編輯狀態
      return dialogState.node?.parentId as string;
    } else if (dialogState.mode === CategoryDialogMode.ADD_MAIN) {
      if (dialogState.type === RootType.INCOME) {
        return rootIncomeCategory.id;
      } else if (dialogState.type === RootType.EXPENSE) {
        return rootExpenseCategory.id;
      }
    }
    toast.error('發生錯誤，無法找尋父類別');
    return null;
  }, [dialogState.mode, dialogState.node, dialogState.type]);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="backdrop-blur-xl bg-background/60 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/10">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">支出分類</CardTitle>
            <CardDescription>管理您的支出類別結構</CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="cursor-pointer hover:bg-red-500/10 hover:text-red-500 transition-colors rounded-full"
            onClick={() => handleAddMain(RootType.EXPENSE)}
          >
            <Plus className="mr-2 h-4 w-4" />
            新增分類
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {expenseTree.length > 0 ? (
            <div className="space-y-1">
              {expenseTree.map((node) => (
                <CategoryTreeItem
                  key={node.id}
                  node={node}
                  onAddSub={handleAddSub}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/20 rounded-lg">
              <span className="text-sm">尚無支出分類</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-xl bg-background/60 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/10">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">收入分類</CardTitle>
            <CardDescription>管理您的收入類別結構</CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="cursor-pointer hover:bg-green-500/10 hover:text-green-500 transition-colors rounded-full"
            onClick={() => handleAddMain(RootType.INCOME)}
          >
            <Plus className="mr-2 h-4 w-4" />
            新增分類
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {incomeTree.length > 0 ? (
            <div className="space-y-1">
              {incomeTree.map((node) => (
                <CategoryTreeItem
                  key={node.id}
                  node={node}
                  onAddSub={handleAddSub}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/20 rounded-lg">
              <span className="text-sm">尚無收入分類</span>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        type={dialogState.type}
        initialData={
          dialogState.mode === CategoryDialogMode.EDIT ? dialogState.node : null
        }
        parentId={decidedParentId} // 就算是新增 mainCategory 也需要帶入 rootCategory 的 id
        parentName={
          dialogState.mode === CategoryDialogMode.ADD_SUB
            ? dialogState.node?.name
            : undefined
        }
        rootIncomeCategory={rootIncomeCategory}
        rootExpenseCategory={rootExpenseCategory}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogState.isOpen}
        onClose={() =>
          setDeleteDialogState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={executeDelete}
        categoryName={deleteDialogState.node?.name || ''}
        isMain={deleteDialogState.node?.isMainCategory}
      />
    </div>
  );
}
