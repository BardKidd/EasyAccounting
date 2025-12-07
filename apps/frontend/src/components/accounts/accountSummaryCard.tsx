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
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-full">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">{type}</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({accounts.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">
            ${totalBalance.toLocaleString()}
          </span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="bg-card px-3 py-1">
          {accounts.map((account, index) => (
            <div key={account.id}>
              <div className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: account.color || 'gray' }}
                  />
                  <span>{account.name}</span>
                </div>
                <span
                  className={cn(
                    'font-mono',
                    account.balance < 0 ? 'text-red-500' : ''
                  )}
                >
                  ${account.balance.toLocaleString()}
                </span>
              </div>
              {index < accounts.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
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
    {} as Record<string, AccountType[]>
  );

  // 按照這個順序排下去
  const accountTypeOrder = [
    AccountEnum.CASH,
    AccountEnum.BANK,
    AccountEnum.CREDIT_CARD,
    AccountEnum.SECURITIES_ACCOUNT,
    AccountEnum.OTHER,
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex justify-between items-center">
          <span>帳戶概覽</span>
          <span className="text-xl font-bold tracking-tight">
            ${totalBalance.toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {accountTypeOrder.map((type) => {
          const typeAccounts = groupedAccounts[type];
          if (!typeAccounts || typeAccounts.length === 0) return null;

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
