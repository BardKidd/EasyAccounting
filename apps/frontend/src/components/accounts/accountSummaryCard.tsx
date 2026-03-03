'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Account as AccountEnum, AccountType } from '@repo/shared';
import {
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  CircleDollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface AccountSummaryCardProps {
  accounts: AccountType[];
}

const accountIcons = {
  [AccountEnum.CASH]: Banknote,
  [AccountEnum.BANK]: Landmark,
  [AccountEnum.CREDIT_CARD]: CreditCard,
  [AccountEnum.SECURITIES_ACCOUNT]: CircleDollarSign,
  [AccountEnum.OTHER]: Wallet,
};

function DashboardAccountGroup({
  type,
  accounts,
}: {
  type: AccountEnum;
  accounts: AccountType[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const Icon = accountIcons[type] || Wallet;
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="border border-slate-200/50 dark:border-white/10 rounded-2xl overflow-hidden bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md">
      <div
        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm text-slate-700 dark:text-slate-200">
            {type}
          </span>
          <span className="text-xs text-slate-500 ml-1">
            ({accounts.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">
            ${totalBalance.toLocaleString()}
          </span>
          {accounts.length > 0 && (
            <div className="h-6 w-6 flex items-center justify-center text-slate-400">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {accounts.length > 0 && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50/80 dark:bg-black/20 px-4 py-2 border-t border-slate-100 dark:border-white/5 backdrop-blur-md">
              {accounts.map((account, index) => (
                <div key={account.id} className="group/item">
                  <div className="flex items-center justify-between py-2.5 text-sm transition-transform group-hover/item:translate-x-1 duration-300">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full ring-2 ring-white/10"
                        style={{ backgroundColor: account.color || 'gray' }}
                      />
                      <span className="text-slate-600 dark:text-slate-300">
                        {account.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'font-mono font-medium text-slate-700 dark:text-slate-300',
                        account.balance < 0
                          ? 'text-rose-500 dark:text-rose-400'
                          : '',
                      )}
                    >
                      ${account.balance.toLocaleString()}
                    </span>
                  </div>
                  {index < accounts.length - 1 && (
                    <Separator className="bg-slate-200/50 dark:bg-white/5" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountSummaryCard({ accounts }: AccountSummaryCardProps) {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // '銀行': [銀行帳戶1, 銀行帳戶2, ...]
  const groupedAccounts = accounts.reduce(
    (acc, account) => {
      const type = account.type as AccountEnum;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(account);
      return acc;
    },
    {} as Record<string, AccountType[]>,
  );

  // 按照這個順序排下去
  const accountTypeOrder = [
    AccountEnum.CASH,
    AccountEnum.BANK,
    AccountEnum.CREDIT_CARD,
    AccountEnum.SECURITIES_ACCOUNT,
  ];

  return (
    <Card className="h-full flex flex-col border-0 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 ring-1 ring-white/50 dark:ring-white/10 dark:shadow-teal-glow relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent pointer-events-none" />
      <CardHeader className="pb-4 border-b border-slate-200 dark:border-white/5 relative z-10">
        <CardTitle className="text-lg font-medium flex justify-between items-center text-slate-700 dark:text-slate-200">
          <span className="font-playfair font-bold text-slate-800 dark:text-slate-100">
            帳戶概覽
          </span>
          <span className="text-2xl font-bold tracking-tight font-outfit text-slate-900 dark:text-white drop-shadow-sm">
            ${totalBalance.toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar pt-4 relative z-10">
        {accountTypeOrder.map((type) => {
          const typeAccounts = groupedAccounts[type] || [];
          return (
            <DashboardAccountGroup
              key={type}
              type={type as AccountEnum}
              accounts={typeAccounts}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

export default AccountSummaryCard;
