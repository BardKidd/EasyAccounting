'use client';

import { Check } from 'lucide-react';
import { Account, AccountType } from '@repo/shared';
import { CategoryIcon } from '@/components/ui/category-icon';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AccountPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountType[];
  value: string;
  onSelect: (accountId: string) => void;
  excludeId?: string;
  title?: string;
}

const formatBalance = (account: AccountType) => {
  const amount = Number(account.balance ?? 0).toLocaleString('en-US');
  return account.currencyCode && account.currencyCode !== 'TWD'
    ? `${amount} ${account.currencyCode}`
    : `$${amount}`;
};

/** 帳戶選擇 bottom sheet：分組列表＋餘額，取代桌面版下拉選單。 */
export function AccountPickerSheet({
  open,
  onOpenChange,
  accounts,
  value,
  onSelect,
  excludeId,
  title = '選擇帳戶',
}: AccountPickerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[78dvh] bg-white/95 backdrop-blur-2xl dark:bg-[#0f172a]/95"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-2">
          {Object.values(Account).map((accountType) => {
            const typeAccounts = accounts.filter(
              (acc) => acc.type === accountType && acc.id !== excludeId,
            );
            if (typeAccounts.length === 0) return null;
            return (
              <div key={accountType}>
                <p className="px-1 pt-3 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                  {accountType}
                </p>
                {typeAccounts.map((acc) => {
                  const selected = acc.id === value;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        onSelect(acc.id);
                        onOpenChange(false);
                      }}
                      className={cn(
                        'flex min-h-[52px] w-full items-center gap-3 border-b border-slate-100 px-1 py-2 text-left text-sm transition-colors last:border-b-0 dark:border-white/5',
                        selected
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5',
                      )}
                    >
                      <CategoryIcon
                        iconName={acc.icon}
                        className="h-4.5 w-4.5 shrink-0 opacity-80"
                      />
                      <span className="font-medium">{acc.name}</span>
                      <span className="ml-auto text-xs text-slate-400 tabular-nums dark:text-slate-500">
                        {formatBalance(acc)}
                      </span>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
