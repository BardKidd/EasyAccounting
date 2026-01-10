'use client';

import { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createCategorySchema,
  CreateCategoryInput,
  CreateCategoryFormValues,
  CategoryType,
  RootType,
} from '@repo/shared';
import IconPicker from '@/components/ui/icon-picker';
import { HexColorPicker } from 'react-colorful';
import { toast } from 'sonner';
import service from '@/services';
import { useRouter } from 'next/navigation';
import { ExtendedCategoryType } from './types';
import { getErrorMessage } from '@/lib/utils';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ExtendedCategoryType | null;
  parentId: string | null;
  type: string;
  parentName?: string;
  rootIncomeCategory: CategoryType;
  rootExpenseCategory: CategoryType;
}

export function CategoryDialog({
  isOpen,
  onClose,
  initialData,
  parentId,
  type,
  parentName,
  rootIncomeCategory,
  rootExpenseCategory,
}: CategoryDialogProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const isSubCategoryMode =
    parentId !== rootIncomeCategory.id &&
    parentId !== rootExpenseCategory.id &&
    !isEditMode;

  const defaultValues: CreateCategoryInput = {
    name: '',
    type: type as RootType,
    icon: 'tag',
    color: '#3b82f6',
    parentId: parentId || null,
  };

  const form = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: defaultValues as any,
  });

  const onSubmit = async (values: CreateCategoryFormValues) => {
    const data = values as CreateCategoryInput;
    try {
      const payload = {
        ...data,
        parentId: parentId || initialData?.parent?.id || null,
      };

      let res;
      if (isEditMode && initialData) {
        res = await service.updateCategory({
          id: initialData.id,
          ...payload,
        });
      } else {
        res = await service.createCategory(payload);
      }

      if (res.isSuccess) {
        toast.success(res.message);
        onClose();
        router.refresh();
      } else {
        toast.error(getErrorMessage(res.error));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          name: initialData.name,
          type: initialData.type as any,
          icon: initialData.icon || 'tag',
          color: initialData.color || '#3b82f6',
          parentId: initialData.parent?.id || null,
        });
      } else {
        form.reset({
          name: '',
          type: type as any,
          icon: 'tag',
          color: '#3b82f6',
          parentId: parentId || null,
        });
      }
    }
  }, [isOpen, initialData, parentId, type, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? (
              '編輯分類'
            ) : isSubCategoryMode ? (
              <span>
                新增 <span className="text-orange-500">{parentName}</span>{' '}
                的子分類
              </span>
            ) : (
              '新增主分類'
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? '修改您的分類設定' : '建立一個新的分類來管理您的收支'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex justify-center">
                      <IconPicker
                        icon={field.value || 'tag'}
                        setIcon={field.onChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名稱</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: 餐飲, 交通..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>代表色</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded border shrink-0"
                        style={{ backgroundColor: field.value || '#000000' }}
                      />
                      <HexColorPicker
                        color={field.value || '#000000'}
                        onChange={field.onChange}
                        style={{ width: '100%', height: '100px' }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" className="cursor-pointer">
                {isEditMode ? '更新' : '新增'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
