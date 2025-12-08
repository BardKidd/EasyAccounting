'use client';

import { AccountType, Account } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  CircleDollarSign,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import * as LucideIcons from 'lucide-react';

const DynamicIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) return null;
  return <Icon className={className} />;
};

interface AccountListProps {
  accounts: AccountType[];
}

const accountIcons = {
  [Account.CASH]: Banknote,
  [Account.BANK]: Landmark,
  [Account.CREDIT_CARD]: CreditCard,
  [Account.SECURITIES_ACCOUNT]: CircleDollarSign,
  [Account.OTHER]: Wallet,
};

const accountTypeOrder = [
  Account.CASH,
  Account.BANK,
  Account.CREDIT_CARD,
  Account.SECURITIES_ACCOUNT,
  Account.OTHER,
];

function CollapsibleAccountGroup({
  type,
  accounts,
}: {
  type: Account;
  accounts: AccountType[];
}) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = accountIcons[type] || Wallet;
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <Card className="border shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">{type}</span>
            <span className="text-sm text-muted-foreground md:hidden">
              ${totalBalance.toLocaleString()}
            </span>
          </div>
          <Badge variant="secondary" className="ml-2 hidden md:inline-flex">
            {accounts.length}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="font-bold text-lg">
              ${totalBalance.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">總資產</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-card">
          {accounts.map((account, index) => (
            <div key={account.id}>
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div
                    className="w-1.5 h-10 rounded-full"
                    style={{ backgroundColor: account.color || 'gray' }}
                  />
                  <div className="p-2 bg-muted/50 rounded-full">
                    <DynamicIcon
                      name={account.icon}
                      className="h-5 w-5 text-muted-foreground"
                    />
                  </div>
                  <div>
                    <div className="font-medium">{account.name}</div>
                    {/* Could add last updated or note here */}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      'font-bold font-mono tracking-tight',
                      account.balance < 0 ? 'text-red-500' : 'text-foreground'
                    )}
                  >
                    ${account.balance.toLocaleString()}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>編輯</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        刪除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {index < accounts.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AccountList({ accounts }: AccountListProps) {
  // Group accounts by type
  const groupedAccounts = accounts.reduce(
    (acc, account) => {
      const type = account.type as Account;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(account);
      return acc;
    },
    {} as Record<string, AccountType[]>
  );

  return (
    <div className="space-y-6">
      {accountTypeOrder.map((type) => {
        const typeAccounts = groupedAccounts[type];
        if (!typeAccounts || typeAccounts.length === 0) return null;

        return (
          <CollapsibleAccountGroup
            key={type}
            type={type as Account}
            accounts={typeAccounts}
          />
        );
      })}
    </div>
  );
}

export default AccountList;
