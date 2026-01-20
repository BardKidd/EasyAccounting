'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@repo/shared';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { BudgetCycleType, CreateBudgetRequest, Budget } from '@/types/budget';
import { CategoryType } from '@repo/shared';
import { useEffect } from 'react';

const formSchema = z
  .object({
    name: z.string().min(1, '請輸入預算名稱'),
    description: z.string().optional(),
    amount: z.coerce.number().min(1, '金額必須大於 0'),
    cycleType: z.nativeEnum(BudgetCycleType),
    cycleStartDay: z.coerce.number().min(1).max(31),
    startDate: z.string().min(1, '請選擇起始日期'),
    endDate: z.string().optional(),
    isRecurring: z.boolean(),
    rollover: z.boolean(),
  })
  // 表單驗證規則：
  // 1. 如果是非週期性預算 (單次)，必須設定結束日期
  .refine(
    (data) => {
      if (!data.isRecurring && !data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: '單次預算必須設定結束日期',
      path: ['endDate'],
    },
  );

export type BudgetFormData = z.infer<typeof formSchema>;

interface BudgetFormProps {
  initialData?: Budget;
  categories: CategoryType[];
  onSubmit: (data: BudgetFormData) => void;
  isLoading?: boolean;
}

export function BudgetForm({
  initialData,
  categories,
  onSubmit,
  isLoading,
}: BudgetFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      amount: initialData?.amount || 0,
      cycleType: initialData?.cycleType || BudgetCycleType.MONTH,
      cycleStartDay: initialData?.cycleStartDay || 1,
      // 處理日期格式 (取 YYYY-MM-DD)
      startDate: initialData?.startDate
        ? initialData.startDate.split('T')[0]
        : new Date().toISOString().split('T')[0],
      endDate: initialData?.endDate ? initialData.endDate.split('T')[0] : '',
      isRecurring: initialData?.isRecurring ?? true,
      rollover: initialData?.rollover ?? true,
    },
  });

  const isRecurring = form.watch('isRecurring');
  const cycleType = form.watch('cycleType');

  useEffect(() => {
    if (initialData) {
      // Reset form with initial data if it changes or just on mount
      // logic handled by defaultValues for now
    }
  }, [initialData]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>預算名稱</FormLabel>
              <FormControl>
                <Input placeholder="例如：月薪預算" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>預算專案說明</FormLabel>
              <FormControl>
                <Input
                  placeholder="例如：包含餐飲、交通、日常用品..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>預算金額</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="cycleType"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>週期類型</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選擇週期" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={BudgetCycleType.MONTH}>每月</SelectItem>
                    <SelectItem value={BudgetCycleType.YEAR}>每年</SelectItem>
                    <SelectItem value={BudgetCycleType.WEEK}>每週</SelectItem>
                    <SelectItem value={BudgetCycleType.DAY}>每日</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 只在週期性預算顯示「週期起始日」選項 */}
          {isRecurring && (
            <FormField
              control={form.control}
              name="cycleStartDay"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>週期起始日</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇日期" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>生效起始日</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isRecurring && (
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>結束日期</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>重複循環</FormLabel>
                <FormDescription>預算是否每個週期自動重複</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 只在週期性預算顯示「餘額結轉」選項 */}
        {isRecurring && (
          <FormField
            control={form.control}
            name="rollover"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>餘額結轉</FormLabel>
                  <FormDescription>將剩餘預算結轉至下個週期</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isLoading}>
          {initialData ? '更新預算' : '建立預算'}
        </Button>
      </form>
    </Form>
  );
}
