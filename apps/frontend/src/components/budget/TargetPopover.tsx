'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { BudgetEnvelopeRow, BudgetTargetType } from '@repo/shared';

// 面向使用者用語（不用內部 enum 值）
const TYPE_LABEL: Record<BudgetTargetType, string> = {
  SET_ASIDE: '每月存入',
  REFILL: '補滿到',
  BALANCE_BY_DATE: '到期前存到',
};

const targetFormSchema = z
  .object({
    type: z.enum(['SET_ASIDE', 'REFILL', 'BALANCE_BY_DATE']),
    amount: z.string().refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 0;
    }, '金額須 ≥ 0'),
    dueMonth: z.string().optional(), // 'YYYY-MM'
  })
  .refine((d) => d.type !== 'BALANCE_BY_DATE' || !!d.dueMonth, {
    message: '請選擇到期月份',
    path: ['dueMonth'],
  });

type TargetFormValues = z.infer<typeof targetFormSchema>;

interface TargetPopoverProps {
  row: BudgetEnvelopeRow;
  onUpsert: (
    categoryId: string,
    data: { type: BudgetTargetType; amount: number; dueDate: string | null },
  ) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
  children: React.ReactNode;
}

export function TargetPopover({
  row,
  onUpsert,
  onDelete,
  children,
}: TargetPopoverProps) {
  const [open, setOpen] = useState(false);
  // 手機改用底部 Sheet；jsdom 無 matchMedia，測試會 fall through 到 Popover 分支
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width:767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const form = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      type: row.target?.type ?? 'REFILL',
      amount: row.target ? String(row.target.amount) : '',
      dueMonth: row.target?.dueDate ? row.target.dueDate.slice(0, 7) : '',
    },
  });

  const watchType = form.watch('type');

  const onSubmit = async (values: TargetFormValues) => {
    const dueDate =
      values.type === 'BALANCE_BY_DATE' && values.dueMonth
        ? `${values.dueMonth}-01`
        : null;
    try {
      await onUpsert(row.categoryId, {
        type: values.type,
        amount: parseFloat(values.amount),
        dueDate,
      });
      toast.success('目標已更新');
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || '更新失敗');
    }
  };

  const handleClear = async () => {
    try {
      await onDelete(row.categoryId);
      toast.success('目標已清除');
      setOpen(false);
      form.reset({ type: 'REFILL', amount: '', dueMonth: '' });
    } catch (err: any) {
      toast.error(err?.message || '清除失敗');
    }
  };

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          「{row.name}」目標
        </p>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-500">類型</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 md:h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as BudgetTargetType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-500">目標金額</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  className="h-11 md:h-9"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchType === 'BALANCE_BY_DATE' && (
          <FormField
            control={form.control}
            name="dueMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-500">
                  到期月份
                </FormLabel>
                <FormControl>
                  <Input type="month" className="h-11 md:h-9" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={form.formState.isSubmitting}
            className="flex-1 h-11 md:h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            {form.formState.isSubmitting ? '處理中...' : '儲存目標'}
          </Button>
          {row.target && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClear}
              className="h-11 md:h-8 cursor-pointer"
            >
              清除
            </Button>
          )}
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-white/10"
        >
          {formBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/10"
      >
        {formBody}
      </PopoverContent>
    </Popover>
  );
}
