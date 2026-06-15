'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  CalendarIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  // Check, // [HIDDEN] 預算功能暫時停用
} from 'lucide-react';
import { format } from 'date-fns';
import {
  CategoryType,
  AccountType,
  CreateTransactionSchema,
  TransactionType,
  RecurringTemplateType,
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
  RecurringFrequency,
} from '@repo/shared';
import { RecurringEditDialog } from './recurringEditDialog';
import { TagMultiSelect } from './tagMultiSelect';
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
import { getSuggestedRate } from '@/services/currency';
import { z } from '@repo/shared';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { TRANSACTION_COLORS } from '@/lib/transactionColors';

interface TransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryType[];
  accounts: AccountType[];
  transaction?: TransactionType | null; // If provided, Edit Mode
  hideDelete?: boolean;
  mode?: 'transaction' | 'template';
  recurringTemplate?: RecurringTemplateType | null;
}

export function TransactionSheet({
  isOpen,
  onClose,
  categories,
  accounts,
  transaction,
  hideDelete = false,
  mode = 'transaction',
  recurringTemplate = null,
}: TransactionSheetProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const isEditMode = !!transaction;
  const isRecurring = !!transaction?.recurringTemplateId;

  // Recurring state
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState<number>(1);
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState<number>(1);
  const [recurringMonth, setRecurringMonth] = useState<number>(1);
  const [recurringDay, setRecurringDay] = useState<number>(1);
  const [recurringTotalOccurrences, setRecurringTotalOccurrences] = useState<
    number | null
  >(null);
  const [recurringEditDialogOpen, setRecurringEditDialogOpen] = useState(false);
  const [recurringDialogMode, setRecurringDialogMode] = useState<
    'edit' | 'delete'
  >('delete');
  const [pendingData, setPendingData] = useState<TransactionFormSchema | null>(
    null,
  );

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
      tagIds: [],
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

  const watchedTargetAccountId = form.watch('targetAccountId');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === watchedAccountId),
    [watchedAccountId, accounts],
  );

  const targetAccount = useMemo(
    () => accounts.find((a) => a.id === watchedTargetAccountId),
    [watchedTargetAccountId, accounts],
  );

  // 跨幣轉帳：來源與目標帳戶幣別不同時，需讓使用者輸入目標帳戶實收金額
  const isCrossCurrencyTransfer =
    watchedType === RootType.OPERATE &&
    !!selectedAccount?.currencyCode &&
    !!targetAccount?.currencyCode &&
    selectedAccount.currencyCode !== targetAccount.currencyCode;

  // API 建議匯率（來源幣→目標幣）：協助使用者填寫目標金額
  const watchedDate = form.watch('date');
  const [suggestedFxRate, setSuggestedFxRate] = useState<number | null>(null);
  useEffect(() => {
    if (
      !isCrossCurrencyTransfer ||
      !selectedAccount?.currencyCode ||
      !targetAccount?.currencyCode
    ) {
      setSuggestedFxRate(null);
      return;
    }
    let active = true;
    const d = watchedDate ? format(watchedDate, 'yyyy-MM-dd') : undefined;
    getSuggestedRate(
      selectedAccount.currencyCode,
      targetAccount.currencyCode,
      d,
    ).then((r) => {
      if (active) setSuggestedFxRate(r);
    });
    return () => {
      active = false;
    };
  }, [
    isCrossCurrencyTransfer,
    selectedAccount?.currencyCode,
    targetAccount?.currencyCode,
    watchedDate,
  ]);

  const isCreditCard = selectedAccount?.type === Account.CREDIT_CARD;

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      setShowRecurring(
        mode === 'template' || !!transaction?.recurringTemplateId,
      );

      // 初始化 recurring state（從 recurringTemplate prop）
      if (recurringTemplate) {
        setRecurringFrequency(recurringTemplate.frequency);
        setRecurringDayOfMonth(recurringTemplate.dayOfMonth ?? 1);
        setRecurringDayOfWeek(recurringTemplate.dayOfWeek ?? 1);
        setRecurringTotalOccurrences(recurringTemplate.totalOccurrences);
        if (recurringTemplate.monthDay) {
          const parts = recurringTemplate.monthDay.split('-');
          setRecurringMonth(parseInt(parts[0]!, 10));
          setRecurringDay(parseInt(parts[1]!, 10));
        }
      }

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
          tagIds: transaction.tags?.map((t) => t.id) ?? [],
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
          tagIds: [],
          installment: {
            totalInstallments: 3,
            interestType: InterestType.NONE,
            calculationMethod: CalculationMethod.ROUND,
            remainderPlacement: RemainderPlacement.FIRST,
            gracePeriod: 0,
            rewardsType: RewardsType.EVERY,
          },
        });
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
        // 跨幣轉帳：目標帳戶實收額（目標幣）；同幣省略時後端預設 = amount
        targetAmount:
          data.targetAmount != null && Number(data.targetAmount) > 0
            ? Number(data.targetAmount)
            : undefined,
        extraAdd: data.extraAdd,
        extraAddLabel: data.extraAddLabel,
        extraMinus: data.extraMinus,
        extraMinusLabel: data.extraMinusLabel,
        tagIds: data.tagIds,
      };
      const result = await services.addTransfer(payload);
      if (result?.isSuccess) {
        toast.success(result.message);
        onClose();
        router.refresh();
      }
    } else if (showRecurring) {
      // Build recurring template
      const result = await services.createRecurringTemplate({
        baseTransactionAttrs: {
          accountId: data.accountId,
          categoryId: data.subCategory || data.mainCategory,
          amount: Number(data.amount),
          type: data.type as RootType.EXPENSE | RootType.INCOME,
          description: data.description ?? null,
          receipt: data.receipt ?? null,
          paymentFrequency: PaymentFrequency.RECURRING,
          extraAdd: data.extraAdd,
          extraAddLabel: data.extraAddLabel,
          extraMinus: data.extraMinus,
          extraMinusLabel: data.extraMinusLabel,
          time: data.time,
        },
        frequency: recurringFrequency,
        dayOfMonth:
          recurringFrequency === RecurringFrequency.MONTHLY
            ? recurringDayOfMonth
            : undefined,
        dayOfWeek:
          recurringFrequency === RecurringFrequency.WEEKLY
            ? recurringDayOfWeek
            : undefined,
        monthDay:
          recurringFrequency === RecurringFrequency.YEARLY
            ? `${String(recurringMonth).padStart(2, '0')}-${String(recurringDay).padStart(2, '0')}`
            : undefined,
        totalOccurrences: recurringTotalOccurrences,
        startDate: format(data.date, 'yyyy-MM-dd'),
      });
      if (result?.isSuccess) {
        toast.success('週期性交易規則已建立，將於設定日期起每筆自動記帳');
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
        tagIds: data.tagIds,
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
      // 跨幣轉帳編輯：帶目標帳戶實收額（目標幣）；後端依 linkId 路由到 updateTransfer。
      // 留空則後端沿用原目標金額（同幣轉帳會自動跟著來源金額連動）。
      targetAmount:
        data.type === RootType.OPERATE &&
        data.targetAmount != null &&
        Number(data.targetAmount) > 0
          ? Number(data.targetAmount)
          : undefined,
      // Update other fields as supported by schema
      paymentFrequency: data.paymentFrequency, // Ensure Schema supports
      extraAdd: data.extraAdd,
      extraAddLabel: data.extraAddLabel,
      extraMinus: data.extraMinus,
      extraMinusLabel: data.extraMinusLabel,
      tagIds: data.tagIds,
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

    // 若為週期性交易，先彈 Dialog 詢問範圍
    if (isRecurring) {
      setRecurringDialogMode('delete');
      setRecurringEditDialogOpen(true);
      return;
    }

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

  const handleRecurringDeleteSingle = async () => {
    if (!transaction?.id) return;
    setRecurringEditDialogOpen(false);
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

  const handleRecurringDeleteAll = async () => {
    if (!transaction?.id || !transaction.recurringTemplateId) return;
    setRecurringEditDialogOpen(false);
    try {
      setIsDeleting(true);
      await services.cancelRecurringTemplate(transaction.recurringTemplateId, {
        transactionId: transaction.id,
      });
      toast.success('整個週期已取消');
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecurringEditAll = async (data: TransactionFormSchema) => {
    if (!transaction?.id || !transaction.recurringTemplateId) return;
    setRecurringEditDialogOpen(false);
    try {
      setIsLoading(true);
      await services.updateRecurringTemplateFuture(
        transaction.recurringTemplateId,
        {
          transactionId: transaction.id,
          baseTransactionAttrs: {
            accountId: data.accountId,
            categoryId: data.subCategory || data.mainCategory,
            amount: Number(data.amount),
            type: data.type as RootType.EXPENSE | RootType.INCOME,
            description: data.description ?? null,
            receipt: data.receipt ?? null,
            extraAdd: data.extraAdd,
            extraAddLabel: data.extraAddLabel,
            extraMinus: data.extraMinus,
            extraMinusLabel: data.extraMinusLabel,
          },
        },
      );
      toast.success('此筆及後續週期已更新');
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: TransactionFormSchema) => {
    try {
      setIsLoading(true);
      if (isEditMode) {
        if (isRecurring) {
          // 週期性交易編輯：先彈 Dialog 詢問
          setPendingData(data);
          setRecurringDialogMode('edit');
          setRecurringEditDialogOpen(true);
          return;
        }
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

  const typeStyles = {
    [RootType.EXPENSE]: {
      bg: 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 border-rose-500',
      focus: 'focus-visible:ring-rose-500/30',
    },
    [RootType.INCOME]: {
      bg: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 border-emerald-500',
      focus: 'focus-visible:ring-emerald-500/30',
    },
    [RootType.OPERATE]: {
      bg: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 border-amber-500',
      focus: 'focus-visible:ring-amber-500/30',
    },
  };

  const currentTypeStyle =
    typeStyles[watchedType as RootType] || typeStyles[RootType.EXPENSE];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col h-dvh bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-2xl border-l border-slate-200/50 dark:border-white/10 shadow-2xl">
        <SheetHeader className="px-6 py-6 border-b border-slate-200/50 dark:border-white/5 bg-transparent">
          <SheetTitle className="text-2xl font-bold font-playfair text-slate-800 dark:text-slate-100">
            {mode === 'template'
              ? isEditMode
                ? '編輯週期事件'
                : '新增週期事件'
              : isEditMode
                ? '編輯交易'
                : '新增交易'}
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
                      <div className="bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-3xl flex gap-1 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
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
                              'flex-1 py-3 text-sm font-bold rounded-2xl transition-all duration-300',
                              field.value === type
                                ? typeStyles[type as RootType].bg
                                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50',
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
                        <SelectTrigger className="w-full cursor-pointer h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800">
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
                          <SelectTrigger className="w-full cursor-pointer h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800">
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
                            <SelectTrigger className="w-full cursor-pointer h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800">
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
                              'h-12 rounded-2xl text-base pl-8 font-medium bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                              currentTypeStyle.focus,
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
                                className={cn(
                                  'h-12 rounded-2xl text-sm bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                                  currentTypeStyle.focus,
                                )}
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
                                  className={cn(
                                    'h-12 rounded-2xl text-base pl-8 font-medium bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                                    currentTypeStyle.focus,
                                  )}
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
                                className={cn(
                                  'h-12 rounded-2xl text-sm bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                                  currentTypeStyle.focus,
                                )}
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
                                  className={cn(
                                    'h-12 rounded-2xl text-base pl-8 font-medium bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                                    currentTypeStyle.focus,
                                  )}
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
                                  className={cn(
                                    'h-12 rounded-2xl text-lg bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                                    currentTypeStyle.focus,
                                  )}
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
                                  <SelectTrigger className="h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800">
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
                                  <SelectTrigger className="h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800">
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

              {/* Recurring Section（只有 template 模式顯示） */}
              {mode === 'template' && (
                <div className="rounded-2xl p-6 bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* 頻率 */}
                    <div>
                      <FormLabel className="text-sm">重複頻率</FormLabel>
                      <div className="flex gap-2 mt-2">
                        {[
                          {
                            label: '每月',
                            value: RecurringFrequency.MONTHLY,
                          },
                          { label: '每週', value: RecurringFrequency.WEEKLY },
                          { label: '每年', value: RecurringFrequency.YEARLY },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRecurringFrequency(opt.value)}
                            className={cn(
                              'flex-1 py-2 text-sm rounded-xl border transition-colors',
                              recurringFrequency === opt.value
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-800'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 每月的幾號 */}
                    {recurringFrequency === RecurringFrequency.MONTHLY && (
                      <div>
                        <FormLabel className="text-sm">每月幾號執行</FormLabel>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={recurringDayOfMonth}
                          onChange={(e) =>
                            setRecurringDayOfMonth(Number(e.target.value))
                          }
                          className="mt-2 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          月底邊界會自動調整（如 31 號 → 2 月最後一天）
                        </p>
                      </div>
                    )}

                    {/* 每週的星期幾 */}
                    {recurringFrequency === RecurringFrequency.WEEKLY && (
                      <div>
                        <FormLabel className="text-sm">每週幾執行</FormLabel>
                        <div className="flex gap-1.5 mt-2">
                          {[
                            { label: '日', value: 0 },
                            { label: '一', value: 1 },
                            { label: '二', value: 2 },
                            { label: '三', value: 3 },
                            { label: '四', value: 4 },
                            { label: '五', value: 5 },
                            { label: '六', value: 6 },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setRecurringDayOfWeek(opt.value)}
                              className={cn(
                                'flex-1 py-2 text-sm rounded-xl border transition-colors',
                                recurringDayOfWeek === opt.value
                                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-800'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 每年的月/日 */}
                    {recurringFrequency === RecurringFrequency.YEARLY && (
                      <div>
                        <FormLabel className="text-sm">
                          每年幾月幾日執行
                        </FormLabel>
                        <div className="flex gap-2 mt-2">
                          <div className="flex-1">
                            <select
                              value={recurringMonth}
                              onChange={(e) =>
                                setRecurringMonth(Number(e.target.value))
                              }
                              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 text-sm"
                            >
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1} 月
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={recurringDay}
                              onChange={(e) =>
                                setRecurringDay(Number(e.target.value))
                              }
                              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 text-sm"
                              placeholder="日"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          若選 2/29，平年將以 2/28 代替
                        </p>
                      </div>
                    )}

                    {/* 結束條件 */}
                    <div>
                      <FormLabel className="text-sm">結束條件</FormLabel>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setRecurringTotalOccurrences(null)}
                          className={cn(
                            'flex-1 py-2 text-sm rounded-xl border transition-colors',
                            recurringTotalOccurrences === null
                              ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-800'
                              : 'border-slate-200 dark:border-slate-700',
                          )}
                        >
                          無限
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecurringTotalOccurrences(12)}
                          className={cn(
                            'flex-1 py-2 text-sm rounded-xl border transition-colors',
                            recurringTotalOccurrences !== null
                              ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-800'
                              : 'border-slate-200 dark:border-slate-700',
                          )}
                        >
                          指定次數
                        </button>
                      </div>
                      {recurringTotalOccurrences !== null && (
                        <input
                          type="number"
                          min={1}
                          value={recurringTotalOccurrences}
                          onChange={(e) =>
                            setRecurringTotalOccurrences(Number(e.target.value))
                          }
                          className="mt-2 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 text-sm"
                          placeholder="次數"
                        />
                      )}
                    </div>
                  </div>
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
                                'justify-start text-left font-normal w-full cursor-pointer h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                                currentTypeStyle.focus,
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
                          className={cn(
                            'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                            currentTypeStyle.focus,
                          )}
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
                          <SelectTrigger className="w-full cursor-pointer h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800">
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

              {/* 跨幣轉帳：目標帳戶實收金額（目標幣計價） */}
              {isCrossCurrencyTransfer && (
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        目標金額（{targetAccount?.currencyCode} 實收）
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={cn(
                            'text-lg font-semibold h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                            currentTypeStyle.focus,
                          )}
                          type="number"
                          step="any"
                          placeholder={`對方帳戶實際收到的 ${targetAccount?.currencyCode} 金額`}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          來源 {selectedAccount?.currencyCode} →{' '}
                          {targetAccount?.currencyCode}：請填對方實收金額；留空則視為等額。
                        </span>
                        {suggestedFxRate != null && (
                          <>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              建議匯率 1 {selectedAccount?.currencyCode} ≈{' '}
                              {suggestedFxRate} {targetAccount?.currencyCode}
                            </span>
                            <button
                              type="button"
                              className="underline hover:text-emerald-600 dark:hover:text-emerald-400"
                              onClick={() => {
                                const amt = Number(form.getValues('amount')) || 0;
                                field.onChange(
                                  Math.round(amt * suggestedFxRate * 100000) /
                                    100000,
                                );
                              }}
                            >
                              套用建議
                            </button>
                          </>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Receipt */}
              {mode !== 'template' && (
                <FormField
                  control={form.control}
                  name="receipt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>發票</FormLabel>
                      <FormControl>
                        <Input
                          className={cn(
                            'text-lg font-semibold h-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors',
                            currentTypeStyle.focus,
                          )}
                          type="text"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Note */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="輸入備註..."
                        {...field}
                        className={cn(
                          'rounded-2xl bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors min-h-[100px] resize-none',
                          currentTypeStyle.focus,
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>標籤</FormLabel>
                    <FormControl>
                      <TagMultiSelect
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="px-6 py-6 border-t border-slate-200/50 dark:border-white/5 bg-transparent flex flex-row! items-center gap-4">
              {isEditMode && !hideDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1 rounded-2xl h-12 font-bold tracking-wide bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-all transform hover:scale-[1.02]"
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

              {/* Recurring Edit/Delete Dialog */}
              <RecurringEditDialog
                isOpen={recurringEditDialogOpen}
                mode={recurringDialogMode}
                onClose={() => setRecurringEditDialogOpen(false)}
                onSelectSingle={
                  recurringDialogMode === 'delete'
                    ? handleRecurringDeleteSingle
                    : () => {
                        setRecurringEditDialogOpen(false);
                        if (pendingData) handleUpdate(pendingData);
                      }
                }
                onSelectAll={
                  recurringDialogMode === 'delete'
                    ? handleRecurringDeleteAll
                    : () => {
                        if (pendingData) handleRecurringEditAll(pendingData);
                      }
                }
                isLoading={isLoading || isDeleting}
              />

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-2xl h-12 font-bold tracking-wide border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                取消
              </Button>
              <Button
                type="submit"
                className={cn(
                  'cursor-pointer flex-1 rounded-2xl h-12 font-bold tracking-wide shadow-lg transition-all transform hover:scale-[1.02]',
                  currentTypeStyle.bg,
                )}
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
