import Link from 'next/link';
import { AccountType, Account as AccountEnum } from '@repo/shared';
import { ChevronRight, Plus, Wallet } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  accountIcons,
  accountTypeOrder,
} from '@/components/accounts/accountIcons';

/**
 * 手機版帳戶總覽：依帳戶類型分組的橫向 snap 卡片列（錢包隱喻），
 * 點任一卡進入 /accounts。取代桌面的 AccountSummaryCard。
 */
function MobileAccountStrip({ accounts }: { accounts: AccountType[] }) {
  const grouped = accounts.reduce(
    (acc, account) => {
      const type = account.type as AccountEnum;
      (acc[type] ??= []).push(account);
      return acc;
    },
    {} as Record<string, AccountType[]>,
  );

  const groups = accountTypeOrder
    .map((type) => ({ type, list: grouped[type] ?? [] }))
    .filter((group) => group.list.length > 0);

  return (
    <section aria-label="帳戶總覽" className="md:hidden space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-outfit text-base font-bold text-slate-800 dark:text-slate-100">
          帳戶
        </h2>
        <Link
          href="/accounts"
          className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 active:opacity-70"
        >
          管理
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {groups.length === 0 ? (
        <Link
          href="/accounts"
          className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 active:bg-slate-500/5"
        >
          <Plus className="size-5 text-emerald-500" />
          建立第一個帳戶
        </Link>
      ) : (
        // -mx-4 讓卡片列貼齊螢幕邊緣捲動（外層 LayoutContent p-4），px-4 補回內距
        <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-3">
            {groups.map(({ type, list }) => {
              const Icon = accountIcons[type] ?? Wallet;
              const total = list.reduce((sum, acc) => sum + acc.balance, 0);
              return (
                <Link
                  key={type}
                  href="/accounts"
                  className="flex w-40 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card dark:bg-slate-800 p-4 shadow-sm transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-4 text-primary" />
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {list.length} 個
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {type}
                    </p>
                    <p
                      className={cn(
                        'truncate font-outfit text-base font-bold tabular-nums',
                        total < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white',
                      )}
                    >
                      {formatCurrency(total)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default MobileAccountStrip;
