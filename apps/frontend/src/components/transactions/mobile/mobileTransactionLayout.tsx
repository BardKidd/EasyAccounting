'use client';

import { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  PencilLine,
  Receipt,
  Settings2,
  Trash2,
  Wallet,
} from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import {
  Account,
  AccountType,
  CategoryType,
  PaymentFrequency,
  RootType,
  TransactionFormSchema,
  CalculationMethod,
  RemainderPlacement,
} from '@repo/shared';
import { CategoryIconRow } from './categoryIconRow';
import { ExtraAmountInline } from './extraAmountInline';
import { AccountPickerSheet } from './accountPickerSheet';
import { QuickDateSheet } from './quickDateSheet';
import { SplitEditor, SplitRow } from '../splitEditor';
import { TagMultiSelect } from '../tagMultiSelect';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileTransactionLayoutProps {
  form: UseFormReturn<TransactionFormSchema>;
  categories: CategoryType[];
  accounts: AccountType[];
  currentMainCategory: CategoryType[];
  isEditMode: boolean;
  hideDelete: boolean;
  isLoading: boolean;
  isDeleting: boolean;
  splitMode: boolean;
  setSplitMode: (v: boolean) => void;
  isCreditCard: boolean;
  isCrossCurrencyTransfer: boolean;
  selectedAccount?: AccountType;
  targetAccount?: AccountType;
  suggestedFxRate: number | null;
  onDelete: () => void;
}

const TYPE_STYLES: Record<
  string,
  { amount: string; seg: string; save: string; badge: string }
> = {
  [RootType.EXPENSE]: {
    amount: 'text-rose-500',
    seg: 'bg-rose-500 text-white shadow-md shadow-rose-500/20',
    save: 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/25',
    badge:
      'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-300',
  },
  [RootType.INCOME]: {
    amount: 'text-emerald-500',
    seg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
    save: 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/25',
    badge:
      'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
  },
  [RootType.OPERATE]: {
    amount: 'text-amber-500',
    seg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
    save: 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/25',
    badge:
      'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-300',
  },
};

const rowClass =
  'flex min-h-12 w-full items-center gap-3 border-b border-slate-100 py-3 text-left text-sm dark:border-white/5';
const rowLabelClass =
  'w-11 shrink-0 text-sm text-slate-500 dark:text-slate-400';
const rowIconClass = 'h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500';

const dateLabel = (date: Date | undefined) => {
  if (!date) return '選擇日期';
  if (isToday(date)) return '今天';
  if (isYesterday(date)) return '昨天';
  return format(date, 'yyyy/MM/dd');
};

/** 手機版交易表單版面：金額置頂、分類同列切換、list rows、進階摺疊、儲存鍵固定底部。 */
export function MobileTransactionLayout({
  form,
  categories,
  accounts,
  currentMainCategory,
  isEditMode,
  hideDelete,
  isLoading,
  isDeleting,
  splitMode,
  setSplitMode,
  isCreditCard,
  isCrossCurrencyTransfer,
  selectedAccount,
  targetAccount,
  suggestedFxRate,
  onDelete,
}: MobileTransactionLayoutProps) {
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const watchedType = form.watch('type');
  const watchedAccountId = form.watch('accountId');
  const watchedPaymentFrequency = form.watch('paymentFrequency');
  const watchedTagIds = form.watch('tagIds');
  const watchedDate = form.watch('date');
  const watchedTime = form.watch('time');

  const isTransfer = watchedType === RootType.OPERATE;
  const typeStyle = TYPE_STYLES[watchedType] ?? TYPE_STYLES[RootType.EXPENSE]!;
  const isInstallment =
    watchedPaymentFrequency === PaymentFrequency.INSTALLMENT;

  // 有進階設定值時預設展開，編輯時不用找
  const [advOpen, setAdvOpen] = useState(
    () => splitMode || isInstallment || (watchedTagIds?.length ?? 0) > 0,
  );

  const advSummary = useMemo(() => {
    const parts: string[] = [];
    if (splitMode) parts.push('拆分');
    if (isInstallment)
      parts.push(`分期 ${form.getValues('installment.totalInstallments')} 期`);
    if ((watchedTagIds?.length ?? 0) > 0)
      parts.push(`標籤 ${watchedTagIds!.length}`);
    return parts.join(' · ');
  }, [splitMode, isInstallment, watchedTagIds, form]);

  return (
    <>
      <SheetHeader className="shrink-0 border-b border-slate-200/50 px-5 py-4 pr-14 dark:border-white/5">
        <div className="flex items-center gap-3">
          <SheetTitle className="font-outfit text-lg font-bold text-slate-800 dark:text-slate-100">
            {isEditMode ? '編輯交易' : '新增交易'}
          </SheetTitle>
          {isEditMode ? (
            <>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-bold',
                  typeStyle.badge,
                )}
              >
                {watchedType}
              </span>
              {!hideDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="更多動作"
                      className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-slate-700/70"
                    >
                      <MoreHorizontal className="h-4.5 w-4.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isDeleting}
                      onSelect={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      刪除交易
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : (
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <div className="ml-auto flex gap-1 rounded-full border border-slate-200/60 bg-slate-100/60 p-1 dark:border-slate-700/50 dark:bg-slate-800/60">
                  {[RootType.EXPENSE, RootType.INCOME, RootType.OPERATE].map(
                    (type) => (
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
                          'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                          field.value === type
                            ? TYPE_STYLES[type]!.seg
                            : 'text-slate-500 dark:text-slate-400',
                        )}
                      >
                        {type}
                      </button>
                    ),
                  )}
                </div>
              )}
            />
          )}
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {/* 金額置頂 */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    {selectedAccount?.currencyCode ?? 'TWD'}
                  </span>
                  <Input
                    aria-label="金額"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    {...field}
                    className={cn(
                      'h-14 border-none bg-transparent! text-right !text-3xl font-bold tracking-tight tabular-nums shadow-none focus-visible:ring-0',
                      typeStyle.amount,
                    )}
                    value={
                      field.value !== undefined && field.value !== null
                        ? Number(field.value).toString()
                        : ''
                    }
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    onFocus={(e) => {
                      if (field.value === 0) e.target.value = '';
                    }}
                    onBlur={(e) => {
                      field.onChange(parseFloat(e.target.value) || 0);
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 額外金額：金額正下方，點擊展開 */}
        <ExtraAmountInline />

        {/* 分類同列切換（拆分模式時分類由子項決定） */}
        {!splitMode && (
          <>
            <FormField
              control={form.control}
              name="mainCategory"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CategoryIconRow
                      mains={currentMainCategory}
                      mainCategory={field.value ?? ''}
                      subCategory={form.watch('subCategory') ?? ''}
                      onSelect={(mainId, subId) => {
                        form.setValue('mainCategory', mainId, {
                          shouldDirty: true,
                        });
                        form.setValue('subCategory', subId, {
                          shouldDirty: true,
                        });
                        form.clearErrors(['mainCategory', 'subCategory']);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subCategory"
              render={() => (
                <FormItem className="space-y-0">
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* list rows */}
        <div className="flex flex-col">
          <FormField
            control={form.control}
            name="accountId"
            render={() => (
              <FormItem className="space-y-0">
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => setAccountPickerOpen(true)}
                >
                  <Wallet className={rowIconClass} />
                  <span className={rowLabelClass}>
                    {isTransfer ? '從帳戶' : '帳戶'}
                  </span>
                  <span
                    className={cn(
                      'font-medium',
                      selectedAccount
                        ? 'text-slate-800 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-500',
                    )}
                  >
                    {selectedAccount?.name ?? '選擇帳戶'}
                  </span>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
                <FormMessage />
              </FormItem>
            )}
          />

          {isTransfer && (
            <>
              <FormField
                control={form.control}
                name="targetAccountId"
                render={() => (
                  <FormItem className="space-y-0">
                    <button
                      type="button"
                      className={rowClass}
                      onClick={() => setTargetPickerOpen(true)}
                    >
                      <Wallet className={rowIconClass} />
                      <span className={rowLabelClass}>到帳戶</span>
                      <span
                        className={cn(
                          'font-medium',
                          targetAccount
                            ? 'text-slate-800 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500',
                        )}
                      >
                        {targetAccount?.name ?? '選擇目標帳戶'}
                      </span>
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isCrossCurrencyTransfer && (
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem className="space-y-0 border-b border-slate-100 py-3 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <span className={cn(rowLabelClass, 'w-auto')}>
                          目標金額（{targetAccount?.currencyCode} 實收）
                        </span>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            placeholder="留空＝等額"
                            {...field}
                            value={field.value ?? ''}
                            className="ml-auto h-10 w-36 rounded-xl text-right text-sm font-semibold tabular-nums"
                          />
                        </FormControl>
                      </div>
                      {suggestedFxRate != null && (
                        <button
                          type="button"
                          className="pt-1 text-xs text-emerald-600 underline dark:text-emerald-400"
                          onClick={() => {
                            const amt = Number(form.getValues('amount')) || 0;
                            field.onChange(
                              Math.round(amt * suggestedFxRate * 100000) /
                                100000,
                            );
                          }}
                        >
                          建議匯率 1 {selectedAccount?.currencyCode} ≈{' '}
                          {suggestedFxRate} {targetAccount?.currencyCode}，套用
                        </button>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </>
          )}

          <FormField
            control={form.control}
            name="date"
            render={() => (
              <FormItem className="space-y-0">
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => setDateSheetOpen(true)}
                >
                  <CalendarDays className={rowIconClass} />
                  <span className={rowLabelClass}>日期</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {dateLabel(watchedDate)}
                    {watchedTime ? ` · ${watchedTime.slice(0, 5)}` : ''}
                  </span>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className={rowClass}>
                  <PencilLine className={rowIconClass} />
                  <span className={rowLabelClass}>備註</span>
                  <FormControl>
                    <input
                      placeholder="點擊輸入…"
                      {...field}
                      className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </FormControl>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="receipt"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className={rowClass}>
                  <Receipt className={rowIconClass} />
                  <span className={rowLabelClass}>發票</span>
                  <FormControl>
                    <input
                      placeholder="點擊輸入…"
                      {...field}
                      className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </FormControl>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 更多選項 */}
          <button
            type="button"
            aria-expanded={advOpen}
            onClick={() => setAdvOpen((o) => !o)}
            className={cn(rowClass, 'border-b-0')}
          >
            <Settings2 className={rowIconClass} />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              更多選項
            </span>
            {advSummary ? (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {advSummary}
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-600">
                拆分・分期・標籤
              </span>
            )}
            <ChevronDown
              className={cn(
                'ml-auto h-4 w-4 shrink-0 text-slate-300 transition-transform motion-reduce:transition-none dark:text-slate-600',
                advOpen && 'rotate-180',
              )}
            />
          </button>

          {advOpen && (
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none dark:border-white/5 dark:bg-white/5">
              {!isTransfer && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">拆分成多個分類</span>
                  <Switch
                    checked={splitMode}
                    disabled={isInstallment}
                    onCheckedChange={(checked) => {
                      setSplitMode(checked);
                      if (checked) {
                        const existing = form.getValues('splits') || [];
                        if (existing.length < 2) {
                          const amt = Number(form.getValues('amount')) || 0;
                          form.setValue('splits', [
                            {
                              categoryId:
                                form.getValues('subCategory') ||
                                form.getValues('mainCategory') ||
                                '',
                              amount: amt,
                              note: '',
                            },
                            { categoryId: '', amount: 0, note: '' },
                          ]);
                        }
                      } else {
                        form.setValue('splits', []);
                      }
                      form.clearErrors();
                    }}
                  />
                </div>
              )}

              {splitMode && !isTransfer && (
                <FormField
                  control={form.control}
                  name="splits"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <SplitEditor
                          categories={categories}
                          type={watchedType as RootType}
                          totalAmount={Number(form.watch('amount')) || 0}
                          value={(field.value as SplitRow[]) || []}
                          onChange={field.onChange}
                          focusClassName=""
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isCreditCard && !isTransfer && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">分期付款</span>
                    <Switch
                      checked={isInstallment}
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
                  {isInstallment && (
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="installment.totalInstallments"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                期數（月）
                              </span>
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={2}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  className="ml-auto h-10 w-24 rounded-xl text-right tabular-nums"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="installment.calculationMethod"
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10 w-full rounded-xl text-sm">
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
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10 w-full rounded-xl text-sm">
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

              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <span className="text-sm font-medium">標籤</span>
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
          )}
        </div>
      </div>

      {/* 儲存鍵固定底部（拇指熱區） */}
      <div className="shrink-0 border-t border-slate-200/50 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/5">
        <Button
          type="submit"
          disabled={isLoading}
          className={cn(
            'h-13 w-full rounded-2xl text-base font-bold tracking-wide text-white transition-all',
            typeStyle.save,
          )}
        >
          {isLoading ? '儲存中…' : isEditMode ? '儲存變更' : '儲存'}
        </Button>
      </div>

      {/* pickers */}
      <AccountPickerSheet
        open={accountPickerOpen}
        onOpenChange={setAccountPickerOpen}
        accounts={accounts}
        value={watchedAccountId ?? ''}
        onSelect={(id) => {
          form.setValue('accountId', id, { shouldDirty: true });
          form.clearErrors('accountId');
          if (
            accounts.find((a) => a.id === id)?.type !== Account.CREDIT_CARD
          ) {
            form.setValue('paymentFrequency', PaymentFrequency.ONE_TIME);
          }
        }}
      />
      <AccountPickerSheet
        open={targetPickerOpen}
        onOpenChange={setTargetPickerOpen}
        accounts={accounts}
        value={form.watch('targetAccountId') ?? ''}
        excludeId={watchedAccountId}
        title="選擇目標帳戶"
        onSelect={(id) => {
          form.setValue('targetAccountId', id, { shouldDirty: true });
          form.clearErrors('targetAccountId');
        }}
      />
      <QuickDateSheet
        open={dateSheetOpen}
        onOpenChange={setDateSheetOpen}
        date={watchedDate}
        time={watchedTime ?? ''}
        onDateChange={(d) => {
          form.setValue('date', d, { shouldDirty: true });
          form.clearErrors('date');
        }}
        onTimeChange={(t) => form.setValue('time', t, { shouldDirty: true })}
      />

      {/* 刪除確認 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除這筆交易嗎？</AlertDialogTitle>
            <AlertDialogDescription>此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
