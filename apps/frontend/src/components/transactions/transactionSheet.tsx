'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  CalendarIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  CategoryType,
  AccountType,
  CreateTransactionSchema,
  TransactionType,
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import services from '@/services';
import { z } from '@repo/shared';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { budgetService } from '@/services/budget';
import { Budget } from '@/types/budget';
import { Badge } from '@/components/ui/badge';
import { TRANSACTION_COLORS } from '@/lib/transactionColors';

interface TransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryType[];
  accounts: AccountType[];
  transaction?: TransactionType | null; // If provided, Edit Mode
}

export function TransactionSheet({
  isOpen,
  onClose,
  categories,
  accounts,
  transaction,
}: TransactionSheetProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const isEditMode = !!transaction;

  useEffect(() => {
    const fetchBudgets = async () => {
      const res = await budgetService.getBudgets();
      if (res.isSuccess) setBudgets(res.data.filter((b) => b.isActive));
    };
    fetchBudgets();
  }, []);

  const findCategoryPath = (
    categoryId: string,
    categoryList: CategoryType[],
  ): { mainCategory: string; subCategory: string } => {
    for (const root of categoryList) {
      if (root.children) {
        for (const main of root.children) {
          if (main.id === categoryId) {
            return { mainCategory: main.id, subCategory: '' };
          }
          if (main.children) {
            for (const sub of main.children) {
              if (sub.id === categoryId) {
                return { mainCategory: main.id, subCategory: sub.id };
              }
            }
          }
        }
      }
    }
    return { mainCategory: '', subCategory: '' };
  };

  const formSchema = useMemo(() => {
    return transactionFormSchema.superRefine((data, ctx) => {
      if (data.type === RootType.OPERATE) return;

      const root = categories.find((c) => c.type === data.type);
      if (!root?.children) return;

      const mainCategory = root.children.find(
        (c) => c.id === data.mainCategory,
      );
      if (!mainCategory) return;

      if (mainCategory.children && mainCategory.children.length > 0) {
        if (!data.subCategory) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '請選擇子分類',
            path: ['subCategory'],
          });
        }
      }

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

  const watchedType = form.watch('type');
  const watchedMainCategory = form.watch('mainCategory');
  const watchedAccountId = form.watch('accountId');
  const watchedPaymentFrequency = form.watch('paymentFrequency');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === watchedAccountId),
    [watchedAccountId, accounts],
  );

  const isCreditCard = selectedAccount?.type === Account.CREDIT_CARD;

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && transaction) {
        // Edit Mode Initialization
        const { mainCategory, subCategory } = findCategoryPath(
          transaction.categoryId,
          categories,
        );

        form.reset({
          accountId: transaction.accountId,
          amount: transaction.amount,
          type: transaction.targetAccountId
            ? RootType.OPERATE
            : transaction.type,
          description: transaction.description || '',
          date: new Date(transaction.date), // Ensure Date object
          time: transaction.time,
          mainCategory,
          subCategory,
          receipt: transaction.receipt || '',
          targetAccountId: transaction.targetAccountId || '',
          paymentFrequency:
            transaction.paymentFrequency || PaymentFrequency.ONE_TIME,
          extraAdd: (transaction as any).extraAdd || 0,
          extraAddLabel: (transaction as any).extraAddLabel || '折扣',
          extraMinus: (transaction as any).extraMinus || 0,
          extraMinusLabel: (transaction as any).extraMinusLabel || '手續費',
          installment: {
            totalInstallments: 3,
            interestType: InterestType.NONE,
            calculationMethod: CalculationMethod.ROUND,
            remainderPlacement: RemainderPlacement.FIRST,
            gracePeriod: 0,
            rewardsType: RewardsType.EVERY,
            ...((transaction as any).installment || {}),
          },
        });

        if ((transaction as any).extraAdd || (transaction as any).extraMinus) {
          setShowExtra(true);
        }
      } else {
        // Create Mode Initialization
        const now = new Date();
        form.reset({
          accountId: '',
          amount: 0,
          type: RootType.EXPENSE,
          description: '',
          date: now,
          time: format(now, 'HH:mm:ss'),
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
        });
        setSelectedBudgetIds([]);
        setShowExtra(false);
      }
    }
  }, [isOpen, isEditMode, transaction, categories, form]);

  const currentMainCategory = useMemo(() => {
    if (!categories) return [];
    const roots = categories.filter(
      (root) => root.type === (watchedType as RootType),
    );
    return roots.flatMap((root) => root.children || []);
  }, [watchedType, categories]);

  const currentSubCategory = useMemo(() => {
    if (!watchedMainCategory || !currentMainCategory) return [];
    const subCategoryMap = new Map<string, CategoryType>();
    currentMainCategory.forEach((cat) => subCategoryMap.set(cat.id, cat));
    const selectedMain = subCategoryMap.get(watchedMainCategory);
    return selectedMain?.children || [];
  }, [watchedMainCategory, currentMainCategory]);

  const handleCreate = async (data: TransactionFormSchema) => {
    // Mock Backdating check
    const transactionDate = new Date(data.date);
    const today = new Date();
    const isBackdated =
      transactionDate < new Date(today.getFullYear(), today.getMonth(), 1);

    if (isBackdated) {
      if (
        !confirm(
          '⚠️ 回溯補帳確認\n\n您正在新增過去週期的交易，這可能會觸發預算歷史重算。\n確定要繼續嗎？',
        )
      ) {
        return;
      }
    }

    if (data.type === RootType.OPERATE) {
      const payload = {
        accountId: data.accountId,
        categoryId: data.subCategory || data.mainCategory,
        amount: Number(data.amount),
        type: RootType.OPERATE as RootType.OPERATE,
        description: data.description,
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
      const result = await services.addTransfer(payload);
      if (result?.isSuccess) {
        toast.success(result.message);
        onClose();
        router.refresh();
      }
    } else {
      const payload: CreateTransactionSchema = {
        accountId: data.accountId,
        categoryId: data.subCategory || data.mainCategory,
        amount: Number(data.amount),
        type: data.type as RootType.EXPENSE | RootType.INCOME,
        description: data.description,
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
        budgetIds: selectedBudgetIds,
      };
      const result = await services.addTransaction(payload);
      if (result?.isSuccess) {
        toast.success(result.message);
        onClose();
        router.refresh();
      }
    }
  };

  const handleUpdate = async (data: TransactionFormSchema) => {
    if (!transaction?.id) return;

    const payload = {
      accountId: data.accountId,
      categoryId: data.subCategory || data.mainCategory,
      amount: Number(data.amount),
      // If type is OPERATE, it's actually an EXPENSE with a target account in the backend
      type: data.type === RootType.OPERATE ? RootType.EXPENSE : data.type,
      description: data.description,
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      receipt: data.receipt,
      // Pass targetAccountId if it's OPERATE (Transfer), otherwise it might need to be cleared (handle logic if needed)
      // For now, if switching to Expense, we assume targetAccountId should be ignored or cleared.
      // But we can only send a value if we have one.
      targetAccountId:
        data.type === RootType.OPERATE ? data.targetAccountId : undefined,
      budgetIds: selectedBudgetIds, // Supported now
      // Update other fields as supported by schema
      paymentFrequency: data.paymentFrequency, // Ensure Schema supports
      extraAdd: data.extraAdd,
      extraAddLabel: data.extraAddLabel,
      extraMinus: data.extraMinus,
      extraMinusLabel: data.extraMinusLabel,
    };

    // Note: updateTransaction schema usually allows partials.
    // However, if we change type, we need to be careful.
    // For now assuming full update payload is fine or backend ignores extras.

    const result = await services.updateTransaction(transaction.id, payload);
    if (result) {
      toast.success('更新成功');
      onClose();
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!transaction?.id) return;

    try {
      setIsDeleting(true);
      await services.deleteTransaction(transaction.id);
      toast.success('刪除成功');
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: TransactionFormSchema) => {
    try {
      setIsLoading(true);
      if (isEditMode) {
        await handleUpdate(data);
      } else {
        await handleCreate(data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const typeColors = {
    [RootType.EXPENSE]: TRANSACTION_COLORS.expense,
    [RootType.INCOME]: TRANSACTION_COLORS.income,
    [RootType.OPERATE]: TRANSACTION_COLORS.transfer,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col h-dvh bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200 dark:border-white/10 shadow-2xl">
        <SheetHeader className="px-6 py-6 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/2">
          <SheetTitle className="text-2xl font-bold font-playfair text-slate-900 dark:text-slate-50">
            {isEditMode ? '編輯交易' : '新增交易'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {/* Type Selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    {isEditMode ? (
                      // Read-only Type Display for Edit Mode
                      <div
                        className={cn(
                          'py-3 px-4 rounded-xl text-center font-medium text-lg shadow-sm',
                          typeColors[field.value as keyof typeof typeColors]
                            ?.bg,
                          typeColors[field.value as keyof typeof typeColors]
                            ?.text,
                          typeColors[field.value as keyof typeof typeColors]
                            ?.bgDark,
                          typeColors[field.value as keyof typeof typeColors]
                            ?.textDark,
                        )}
                      >
                        {field.value}
                      </div>
                    ) : (
                      // Interactive Type Selector for Create Mode
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
                    )}
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

              {/* Budget Selection - Available for Expense in both modes */}
              {watchedType === RootType.EXPENSE && (
                <div className="space-y-2">
                  <FormLabel>歸入預算</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal min-h-10 h-auto py-2 cursor-pointer"
                      >
                        {selectedBudgetIds.length === 0 ? (
                          <span className="text-muted-foreground">
                            無預算專案
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedBudgetIds.map((id) => {
                              const b = budgets.find((x) => x.id === id);
                              if (!b) return null;
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBudgetIds((prev) =>
                                      prev.filter((p) => p !== id),
                                    );
                                  }}
                                >
                                  {b.name} <X className="ml-1 h-3 w-3" />
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                      <div className="space-y-1">
                        {budgets.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => {
                              setSelectedBudgetIds((prev) =>
                                prev.includes(b.id)
                                  ? prev.filter((p) => p !== b.id)
                                  : [...prev, b.id],
                              );
                            }}
                          >
                            <div
                              className={cn(
                                'h-4 w-4 rounded border flex items-center justify-center',
                                selectedBudgetIds.includes(b.id)
                                  ? 'bg-primary border-primary'
                                  : 'border-input',
                              )}
                            >
                              {selectedBudgetIds.includes(b.id) && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <span className="text-sm">{b.name}</span>
                          </div>
                        ))}
                        {budgets.length === 0 && (
                          <div className="text-sm text-muted-foreground py-2 text-center">
                            尚無預算專案
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
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
                            value={
                              field.value !== undefined && field.value !== null
                                ? Number(field.value).toString()
                                : ''
                            }
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

              {/* Installment Section */}
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

            <SheetFooter className="px-6 py-4 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/2 flex flex-row! items-center gap-3">
              {isEditMode && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      刪除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        確定要刪除這筆交易嗎？
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作無法復原。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                      >
                        刪除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="submit"
                className="cursor-pointer flex-1"
                disabled={isLoading}
              >
                {isLoading ? '儲存中...' : isEditMode ? '儲存' : '儲存交易'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
