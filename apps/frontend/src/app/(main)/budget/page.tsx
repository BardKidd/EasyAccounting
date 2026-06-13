'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  BudgetMonthNav,
  ReadyToAssignCard,
  BudgetTable,
  OverspendingBanner,
  InitBudgetDialog,
} from '@/components/budget';
import {
  getBudgetStatus,
  getBudgetMonth,
  initBudget,
  assignBudget,
  moveBudgetMoney,
} from '@/services/budget';
import { getPersonnelAccounts } from '@/services/personnelAccount';
import type { BudgetMonthView, AccountType } from '@repo/shared';
import { Calculator } from 'lucide-react';

/** 僅作 status 載入前的初始預設值；「當月」上界一律以伺服器回傳的 currentMonth 為準（M3） */
function currentMonth1st(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** 限制月份在 [start, current]（後端同樣驗證，這裡是 UX 防呆） */
function clampMonth(month: string, start: string, current: string): string {
  if (month < start) return start;
  if (month > current) return current;
  return month;
}

/** optimistic 更新：行內改 assigned 時同步推導 available / totals / RTA */
function patchAssigned(
  view: BudgetMonthView,
  categoryId: string,
  assigned: number,
): BudgetMonthView {
  const row = view.rows.find((r) => r.categoryId === categoryId);
  if (!row) return view;
  const delta = assigned - row.assigned;
  return {
    ...view,
    readyToAssign: view.readyToAssign - delta,
    // 同步 rtaBreakdown.cumulativeAssigned，使 RTA Popover 明細在 revalidate 前與大數字一致
    rtaBreakdown: {
      ...view.rtaBreakdown,
      cumulativeAssigned: view.rtaBreakdown.cumulativeAssigned + delta,
    },
    rows: view.rows.map((r) =>
      r.categoryId === categoryId
        ? {
            ...r,
            assigned,
            available: r.available + delta,
            isOverspent: r.available + delta < 0,
          }
        : r,
    ),
    totals: {
      ...view.totals,
      assigned: view.totals.assigned + delta,
      available: view.totals.available + delta,
    },
  };
}

export default function BudgetPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth1st());
  const [initOpen, setInitOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountType[]>([]);

  const {
    data: status,
    isLoading: statusLoading,
    mutate: mutateStatus,
  } = useSWR('/budget', getBudgetStatus, { revalidateOnFocus: false });

  const enabled = !!status?.enabled && !!status.startMonth;
  // 「當月」一律用伺服器回傳值，避免瀏覽器本地時間與伺服器時間在月初落差（M3）
  const serverCurrentMonth = status?.currentMonth ?? currentMonth1st();
  const month = enabled
    ? clampMonth(selectedMonth, status.startMonth!, serverCurrentMonth)
    : selectedMonth;

  const { data: monthView, mutate: mutateMonth } = useSWR(
    enabled ? ['/budget/months', month] : null,
    ([, m]: [string, string]) => getBudgetMonth(m),
    {
      revalidateOnFocus: false,
      keepPreviousData: true, // 切月份時保留舊畫面，避免白屏
    },
  );

  // Init budget
  const handleInit = async (
    startMonth: string,
    accountOverrides: Array<{ accountId: string; onBudget: boolean }>,
  ) => {
    await initBudget({ startMonth, accountOverrides });
    setSelectedMonth(startMonth);
    await mutateStatus();
  };

  // Assign：optimistic mutate（spec §7），失敗自動 rollback 並 revalidate
  const handleAssign = async (categoryId: string, assigned: number) => {
    try {
      await mutateMonth(
        async (current) => {
          await assignBudget(month, categoryId, assigned);
          // 回傳「樂觀推導後」的視圖（而非 pre-optimistic 的 current）寫回快取，
          // 否則 PUT 完成瞬間會把舊值寫回快取造成閃值；revalidate 隨後抓回真實推導結果（M5）
          return current ? patchAssigned(current, categoryId, assigned) : current;
        },
        {
          optimisticData: (current) =>
            current ? patchAssigned(current, categoryId, assigned) : current!,
          rollbackOnError: true,
          revalidate: true,
        },
      );
    } catch (err: any) {
      toast.error(err?.message || '分配失敗');
    }
  };

  // Move money
  const handleMove = async (
    fromCategoryId: string | null,
    toCategoryId: string | null,
    amount: number,
  ) => {
    await moveBudgetMoney(month, { fromCategoryId, toCategoryId, amount });
    await mutateMonth();
  };

  // Load accounts for init dialog
  const openInitDialog = async () => {
    try {
      const accs = await getPersonnelAccounts();
      setAccounts(accs);
      setInitOpen(true);
    } catch {
      toast.error('載入帳戶失敗');
    }
  };

  // --- Not enabled state ---
  if (!statusLoading && status && !status.enabled) {
    return (
      <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-outfit uppercase tracking-widest bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent drop-shadow-sm">
            預算
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
            <Calculator className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
              開始掌控你的每一分錢
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              把真實帳戶裡的錢分配到各個支出分類，讓每一塊錢都有歸屬——
              就像把現金分裝進不同信封一樣。
            </p>
          </div>
          <Button
            size="lg"
            onClick={openInitDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 cursor-pointer"
          >
            啟用預算
          </Button>
        </div>

        <InitBudgetDialog
          open={initOpen}
          onOpenChange={setInitOpen}
          accounts={accounts}
          onInit={handleInit}
        />
      </Container>
    );
  }

  // --- Loading state ---
  if (statusLoading) {
    return (
      <Container className="py-8 space-y-6 max-w-[1600px] px-4 md:px-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </Container>
    );
  }

  // 含「轉出（未分類）」虛擬列的負 available——它不在 rows 內、卻同樣會計入
  // priorOverspend 扣下月 RTA，漏掉會讓使用者收不到提示（M4）
  const hasOverspending =
    (monthView?.rows.some((r) => r.isOverspent) ?? false) ||
    (monthView?.unclassifiedTransferOut?.available ?? 0) < 0;
  const baseCurrency = status?.baseCurrencyCode || 'TWD';

  return (
    <Container className="py-8 space-y-6 max-w-[1600px] px-4 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-outfit uppercase tracking-widest bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent drop-shadow-sm">
            預算
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            分配你的每一分錢
          </p>
        </div>

        <BudgetMonthNav
          startMonth={status?.startMonth || month}
          currentMonth={serverCurrentMonth}
          value={month}
          onChange={setSelectedMonth}
        />
      </div>

      {/* RTA Card */}
      {monthView && (
        <ReadyToAssignCard
          readyToAssign={monthView.readyToAssign}
          rtaBreakdown={monthView.rtaBreakdown}
          baseCurrencyCode={baseCurrency}
        />
      )}

      {/* Overspending Banner */}
      {hasOverspending && <OverspendingBanner />}

      {/* Budget Table */}
      {monthView ? (
        <BudgetTable
          data={monthView}
          month={month}
          baseCurrencyCode={baseCurrency}
          onAssign={handleAssign}
          onMove={handleMove}
        />
      ) : (
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      )}
    </Container>
  );
}
