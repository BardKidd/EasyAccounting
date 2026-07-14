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
import type { BudgetEnvelopeRow } from '@repo/shared';

const RTA_TARGET = '__RTA__';

const moveFormSchema = z.object({
  direction: z.enum(['out', 'in']), // out = 從此分類移出；in = 移入此分類
  target: z.string().min(1, '請選擇對象'),
  amount: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, '金額須為正數'),
});

type MoveFormValues = z.infer<typeof moveFormSchema>;

interface MoveMoneyPopoverProps {
  rows: BudgetEnvelopeRow[];
  currentCategoryId: string;
  onMove: (
    fromCategoryId: string | null,
    toCategoryId: string | null,
    amount: number,
  ) => Promise<void>;
  /** 觸發器（spec §7：點 Available 開啟） */
  children: React.ReactNode;
}

export function MoveMoneyPopover({
  rows,
  currentCategoryId,
  onMove,
  children,
}: MoveMoneyPopoverProps) {
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

  const form = useForm<MoveFormValues>({
    resolver: zodResolver(moveFormSchema),
    defaultValues: { direction: 'out', target: RTA_TARGET, amount: '' },
  });

  const onSubmit = async (values: MoveFormValues) => {
    const other = values.target === RTA_TARGET ? null : values.target;
    const from = values.direction === 'out' ? currentCategoryId : other;
    const to = values.direction === 'out' ? other : currentCategoryId;
    try {
      await onMove(from, to, parseFloat(values.amount));
      toast.success('預算已轉移');
      setOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(err?.message || '轉移失敗');
    }
  };

  const otherRows = rows.filter((r) => r.categoryId !== currentCategoryId);

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          轉移預算
        </p>

        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-500">方向</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 md:h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="out">從此分類移出</SelectItem>
                  <SelectItem value="in">移入此分類</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-slate-500">對象</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 md:h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={RTA_TARGET}>可分配金額 (RTA)</SelectItem>
                  {otherRows.map((r) => (
                    <SelectItem key={r.categoryId} value={r.categoryId}>
                      {r.name}
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
              <FormLabel className="text-xs text-slate-500">金額</FormLabel>
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

        <Button
          type="submit"
          size="sm"
          disabled={form.formState.isSubmitting}
          className="w-full h-11 md:h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          {form.formState.isSubmitting ? '處理中...' : '確認轉移'}
        </Button>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) form.reset();
        }}
      >
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
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
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
