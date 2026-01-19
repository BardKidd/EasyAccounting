'use client';

import { useMemo, useState, useEffect } from 'react';
import { CalendarIcon, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import {
  CategoryType,
  AccountType,
  CreateTransactionSchema,
} from '@repo/shared';
import {
  RootType,
  Account,
  PaymentFrequency,
  transactionFormSchema,
  TransactionFormSchema,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RewardsType,
} from '@repo/shared';
import { cn, getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import services from '@/services';
import { z } from '@repo/shared';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { budgetService } from '@/services/mock/budgetMock';
import { Budget } from '@/types/budget';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

function NewTransactionSheet({
  categories,
  accounts,
}: {
  categories: CategoryType[];
  accounts: AccountType[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchBudgets = async () => {
      const res = await budgetService.getBudgets();
      if (res.isSuccess) setBudgets(res.data.filter(b => b.isActive));
    };
    fetchBudgets();
  }, []);

  // 因為 subCategory 還沒選擇，所以只能在這裡判斷
  const formSchema = useMemo(() => {
    return transactionFormSchema.superRefine((data, ctx) => {
      if (data.type === RootType.OPERATE) return;

      // 找出對應的 Root Category
      const root = categories.find((c) => c.type === data.type);
      if (!root?.children) return;

      // 找出選中的 Main Category
      const mainCategory = root.children.find(
        (c) => c.id === data.mainCategory,
      );
      if (!mainCategory) return;

      // 如果該 Main Category 下有子分類，則 subCategory 必填
      if (mainCategory.children && mainCategory.children.length > 0) {
        if (!data.subCategory) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '請選擇子分類',
            path: ['subCategory'],
          });
        }
      }

      // 分期判斷
      if (
        data.paymentFrequency === PaymentFrequency.INSTALLMENT &&
        data.installment
      ) {
        if (data.installment.totalInstallments < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '分期期數至少 2 期',
            path: ['installment.totalInstallments'],
          });
        }
      }

      // 額外金額驗證
      if (data.extraAdd && data.extraAdd < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '金額不可為負數',
          path: ['extraAdd'],
        });
      }
      if (data.extraMinus && data.extraMinus < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '金額不可為負數',
          path: ['extraMinus'],
        });
      }
    });
  }, [categories]);

  const form = useForm<TransactionFormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: '',
      amount: 0,
      type: RootType.EXPENSE,
      description: '',
      // 解決 Hydration Mismatch: 初始值給 undefined/空字串，在 useEffect 補上
      date: undefined,
      time: '',
      mainCategory: '',
      subCategory: '',
      receipt: '',
      targetAccountId: '',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      extraAdd: 0,
      extraAddLabel: '折扣',
      extraMinus: 0,
      extraMinusLabel: '手續費',
      installment: {
        totalInstallments: 3,
        interestType: InterestType.NONE,
        calculationMethod: CalculationMethod.ROUND,
        remainderPlacement: RemainderPlacement.FIRST,
        gracePeriod: 0,
        rewardsType: RewardsType.EVERY,
      },
    },
  });

  // 使用 watch 來監聽表單值的變化
  const watchedType = form.watch('type');
  const watchedMainCategory = form.watch('mainCategory');
  const watchedAccountId = form.watch('accountId');
  const watchedPaymentFrequency = form.watch('paymentFrequency');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === watchedAccountId),
    [watchedAccountId, accounts],
  );

  const isCreditCard = selectedAccount?.type === Account.CREDIT_CARD;

  // 解決 Hydration Mismatch: 在 Client 端才設定預設時間。
  // 根本原因：SSR 的時候宣告 new Date() 會和 CSR 渲染時的結果不一樣，兩份 HTML 不一樣造成 React 警告。
  useEffect(() => {
    const now = new Date();
    form.reset({
      ...form.getValues(),
      date: now,
      time: format(now, 'HH:mm:ss'),
    });
  }, [form]);

  const currentMainCategory = useMemo(() => {
    if (!categories) return [];

    const roots = categories.filter(
      (root) => root.type === (watchedType as RootType),
    );

    // flatMap 比較少用記錄一下：先 map 後 flat，少一步驟。e.g. [{children: []}, {children: []}] -> map: [ [], [] ] -> flat: []
    const mainCategories = roots.flatMap((root) => root.children || []);

    return mainCategories;
  }, [watchedType, categories]);

  const currentSubCategory = useMemo(() => {
    if (!watchedMainCategory || !currentMainCategory) return [];

    const subCategoryMap = new Map<string, CategoryType>();
    currentMainCategory.forEach((cat) => {
      subCategoryMap.set(cat.id, cat);
    });

    const selectedMain = subCategoryMap.get(watchedMainCategory);

    if (!selectedMain || !selectedMain.children) return [];

    return selectedMain.children;
  }, [watchedMainCategory, currentMainCategory]);

  useEffect(() => {
    if (watchedMainCategory || form.getValues('subCategory')) {
      // Mock auto-selection: if no budget selected, pick first one if available
      // In real app, we would check BudgetCategory map
      if (budgets.length > 0 && selectedBudgetIds.length === 0 && watchedType === RootType.EXPENSE) {
         // Just a mock behavior
         // setSelectedBudgetIds([budgets[0].id]);
      }
    }
  }, [watchedMainCategory, form.watch('subCategory'), budgets, watchedType, selectedBudgetIds.length]);

  const handleExpenseAndIncomeChange = async (data: TransactionFormSchema) => {
    // Mock Backdating check
    const transactionDate = new Date(data.date);
    const today = new Date();
    // Simple check: if month is different (earlier)
    const isBackdated = transactionDate < new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (isBackdated) {
        if (!confirm('⚠️ 回溯補帳確認\n\n您正在新增過去週期的交易，這可能會觸發預算歷史重算。\n確定要繼續嗎？')) {
            return;
        }
    }

    // 整理成 API 需要的格式
    const payload: CreateTransactionSchema = {
      accountId: data.accountId,
      categoryId: data.subCategory || data.mainCategory,
      amount: Number(data.amount),
      type: data.type as RootType.EXPENSE | RootType.INCOME,
      description: data.description,
      // User 選什麼時間就存什麼。存當地時間，不需要轉為 +0
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      receipt: data.receipt,
      paymentFrequency: data.paymentFrequency,
      installment:
        data.paymentFrequency === PaymentFrequency.INSTALLMENT
          ? (data.installment as CreateTransactionSchema['installment'])
          : undefined,
      extraAdd: data.extraAdd,
      extraAddLabel: data.extraAddLabel,
      extraMinus: data.extraMinus,
      extraMinusLabel: data.extraMinusLabel,
    };

    // Mock: Include selected budgets
    (payload as any).budgetIds = selectedBudgetIds;

    try {
      setIsLoading(true);
      const result = await services.addTransaction(payload);
      if (result?.isSuccess) {
        setIsOpen(false);
        toast.success(result.message);
        router.refresh();
        form.reset();
        setShowExtra(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOperateChange = async (data: TransactionFormSchema) => {
    const payload = {
      accountId: data.accountId,
      categoryId: data.subCategory || data.mainCategory,
      amount: Number(data.amount),
      type: RootType.OPERATE as RootType.OPERATE,
      description: data.description,
      // User 選什麼時間就存什麼。存當地時間，不需要轉為 +0
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      receipt: data.receipt,
      paymentFrequency: data.paymentFrequency,
      targetAccountId: data.targetAccountId as string,
      extraAdd: data.extraAdd,
      extraAddLabel: data.extraAddLabel,
      extraMinus: data.extraMinus,
      extraMinusLabel: data.extraMinusLabel,
    };

    try {
      setIsLoading(true);
      const result = await services.addTransfer(payload);
      if (result?.isSuccess) {
        setIsOpen(false);
        toast.success(result.message);
        router.refresh();
        form.reset();
        setShowExtra(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: TransactionFormSchema) => {
    if (data.type === RootType.EXPENSE || data.type === RootType.INCOME) {
      await handleExpenseAndIncomeChange(data);
    } else {
      // 轉帳類
      await handleOperateChange(data);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="cursor-pointer bg-slate-900 dark:bg-slate-50 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-xl shadow-slate-300/50 dark:shadow-none border-0 transition-all duration-300 transform hover:scale-105 rounded-full px-6 h-11 text-sm font-medium font-playfair tracking-wide">
          <Plus className="mr-2 h-4 w-4" /> 新增交易
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col h-dvh bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200 dark:border-white/10 shadow-2xl">
        <SheetHeader className="px-6 py-6 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/2">
          <SheetTitle className="text-2xl font-bold font-playfair text-slate-900 dark:text-slate-50">
            新增交易
          </SheetTitle>
          <SheetDescription className="text-slate-500 dark:text-slate-400">
            請輸入交易詳細資訊
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl flex gap-1">
                      {[
                        RootType.EXPENSE,
                        RootType.INCOME,
                        RootType.OPERATE,
                      ].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            field.onChange(type);
                            form.setValue('mainCategory', '');
                            form.setValue('subCategory', '');
                            form.clearErrors();
                          }}
                          className={cn(
                            'flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 shadow-sm',
                            field.value === type
                              ? type === RootType.EXPENSE
                                ? 'bg-rose-500 text-white shadow-rose-200 dark:shadow-rose-900/30'
                                : type === RootType.INCOME
                                  ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900/30'
                                  : 'bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-900/30'
                              : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 shadow-none',
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>帳戶</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (
                          accounts.find((a) => a.id === v)?.type !==
                          Account.CREDIT_CARD
                        ) {
                          form.setValue(
                            'paymentFrequency',
                            PaymentFrequency.ONE_TIME,
                          );
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder="選擇帳戶" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(Account).map((accountType) => {
                          const typeAccounts = accounts.filter(
                            (acc) => acc.type === accountType,
                          );
                          if (typeAccounts.length === 0) return null;
                          return (
                            <SelectGroup key={accountType}>
                              <SelectLabel>{accountType}</SelectLabel>
                              {typeAccounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Selection */}
              <div
                className={cn(
                  'grid gap-4',
                  watchedType !== RootType.OPERATE && ' grid-cols-2',
                )}
              >
                <FormField
                  control={form.control}
                  name="mainCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主分類</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('subCategory', '');
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="選擇主分類" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentMainCategory.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedType !== RootType.OPERATE && (
                  <FormField
                    control={form.control}
                    name="subCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>子分類</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={
                            !watchedMainCategory ||
                            currentSubCategory.length === 0
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="w-full cursor-pointer">
                              <SelectValue
                                placeholder={
                                  currentSubCategory.length === 0
                                    ? '無子分類'
                                    : '選擇子分類'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currentSubCategory.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Budget Selection */}
              {watchedType === RootType.EXPENSE && (
                <div className="space-y-2">
                  <FormLabel>歸入預算 (Mock Data)</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedBudgetIds.map((id) => {
                      const b = budgets.find((x) => x.id === id);
                      if (!b) return null;
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            setSelectedBudgetIds((prev) =>
                              prev.filter((p) => p !== id),
                            )
                          }
                        >
                          {b.name} <X className="ml-1 h-3 w-3" />
                        </Badge>
                      );
                    })}
                  </div>
                  <Select
                    onValueChange={(val) => {
                      const id = Number(val);
                      if (!selectedBudgetIds.includes(id)) {
                        setSelectedBudgetIds([...selectedBudgetIds, id]);
                      }
                    }}
                    value=""
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇預算..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {budgets
                        .filter((b) => !selectedBudgetIds.includes(b.id))
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    💡 根據分類設定，已預選相關預算
                  </p>
                </div>
              )}

              {/* Amount */}
              <div className="pt-2 pb-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>金額</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <span
                            className={cn(
                              'absolute left-3 top-2 text-xl font-serif',
                              watchedType === RootType.EXPENSE
                                ? 'text-rose-500'
                                : watchedType === RootType.INCOME
                                  ? 'text-emerald-500'
                                  : 'text-amber-500',
                            )}
                          >
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            className={cn(
                              'h-10 text-base pl-8 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                              watchedType === RootType.EXPENSE
                                ? 'focus-visible:ring-rose-500/30'
                                : watchedType === RootType.INCOME
                                  ? 'focus-visible:ring-emerald-500/30'
                                  : 'focus-visible:ring-amber-500/30',
                            )}
                            value={field.value || ''}
                            onChange={(e) =>
                              field.onChange(e.target.valueAsNumber || 0)
                            }
                            onFocus={(e) => {
                              if (field.value === 0) e.target.value = '';
                            }}
                            onBlur={(e) => {
                              const parsed = parseFloat(e.target.value) || 0;
                              field.onChange(parsed);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isCreditCard && watchedType !== RootType.OPERATE && (
                <div className="rounded-2xl p-6 bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-6">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base font-medium">
                      啟用分期付款
                    </FormLabel>
                    <Switch
                      checked={
                        watchedPaymentFrequency === PaymentFrequency.INSTALLMENT
                      }
                      onCheckedChange={(checked) => {
                        form.setValue(
                          'paymentFrequency',
                          checked
                            ? PaymentFrequency.INSTALLMENT
                            : PaymentFrequency.ONE_TIME,
                        );
                      }}
                    />
                  </div>

                  {watchedPaymentFrequency === PaymentFrequency.INSTALLMENT && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormField
                        control={form.control}
                        name="installment.totalInstallments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>分期期數 (月)</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input
                                  type="number"
                                  {...field}
                                  className="h-12 text-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-slate-400"
                                  placeholder="0"
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  min={2}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="installment.calculationMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>計算方式</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={CalculationMethod.ROUND}>
                                    四捨五入
                                  </SelectItem>
                                  <SelectItem value={CalculationMethod.FLOOR}>
                                    無條件捨去
                                  </SelectItem>
                                  <SelectItem value={CalculationMethod.CEIL}>
                                    無條件進位
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="installment.remainderPlacement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>餘數分配</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={RemainderPlacement.FIRST}>
                                    首期調整
                                  </SelectItem>
                                  <SelectItem value={RemainderPlacement.LAST}>
                                    末期調整
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Extra Amount Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full flex justify-between items-center px-0 hover:bg-transparent hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer group"
                  onClick={() => setShowExtra(!showExtra)}
                >
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    額外金額 (加項/減項)
                  </span>
                  {showExtra ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" />
                  )}
                </Button>

                {showExtra && (
                  <div className="grid gap-6 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="extraAddLabel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-slate-500">
                              加項名稱
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="例如：獎金"
                                {...field}
                                className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="extraAdd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-slate-500">
                              加項金額
                            </FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <span className="absolute left-3 top-2.5 text-base font-serif text-emerald-500">
                                  +
                                </span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  className="h-10 text-base pl-8 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30"
                                  value={field.value || ''}
                                  onChange={(e) =>
                                    field.onChange(e.target.valueAsNumber || 0)
                                  }
                                  onFocus={(e) => {
                                    if (field.value === 0) {
                                      e.target.value = '';
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const parsed =
                                      parseFloat(e.target.value) || 0;
                                    field.onChange(parsed);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="extraMinusLabel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-slate-500">
                              減項名稱
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="例如：稅金"
                                {...field}
                                className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="extraMinus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-slate-500">
                              減項金額
                            </FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <span className="absolute left-3 top-2.5 text-base font-serif text-rose-500">
                                  -
                                </span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  className="h-10 text-base pl-8 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-rose-500/30"
                                  value={field.value || ''}
                                  onChange={(e) =>
                                    field.onChange(e.target.valueAsNumber || 0)
                                  }
                                  onFocus={(e) => {
                                    if (field.value === 0) {
                                      e.target.value = '';
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const parsed =
                                      parseFloat(e.target.value) || 0;
                                    field.onChange(parsed);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Date / Time */}
              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>日期</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant={'outline'}
                              className={cn(
                                'justify-start text-left font-normal w-full cursor-pointer',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, 'yyyy/MM/dd')
                              ) : (
                                <span>選擇日期</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            required
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>時間</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          step="1"
                          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Target Account (Only for OPERATE) */}
              {watchedType === RootType.OPERATE && (
                <FormField
                  control={form.control}
                  name="targetAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目標帳戶</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="選擇目標帳戶" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(Account).map((accountType) => {
                            const typeAccounts = accounts.filter(
                              (acc) =>
                                acc.type === accountType &&
                                acc.id !== watchedAccountId,
                            );
                            if (typeAccounts.length === 0) return null;
                            return (
                              <SelectGroup key={accountType}>
                                <SelectLabel>{accountType}</SelectLabel>
                                {typeAccounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Receipt */}
              <FormField
                control={form.control}
                name="receipt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>發票</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="發票號碼"
                        className="text-lg font-semibold"
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Textarea placeholder="輸入備註..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 mt-auto">
              <Button
                type="submit"
                className="cursor-pointer w-full h-12 text-lg font-medium rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-xl shadow-slate-300/50 dark:shadow-none transition-all duration-300 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? '儲存中...' : '儲存交易'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default NewTransactionSheet;
