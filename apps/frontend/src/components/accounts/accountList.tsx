'use client';

import { AccountType, Account, PageType } from '@repo/shared';
import { Card } from '@/components/ui/card';
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
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';
import AccountDialog from '@/components/accounts/accountDialog';
import AccountDeleteConfirmDialog from '@/components/accounts/accountDeleteConfirmDialog';
// import { ExcelExportButton } from '@/components/common/ExcelExportButton';
// import { ExcelImportButton } from '@/components/common/ExcelImportButton';

// 順序
const accountTypeOrder = [
  Account.CASH,
  Account.BANK,
  Account.CREDIT_CARD,
  Account.SECURITIES_ACCOUNT,
  Account.OTHER,
];
// 大卡 icon
const accountIcons = {
  [Account.CASH]: Banknote,
  [Account.BANK]: Landmark,
  [Account.CREDIT_CARD]: CreditCard,
  [Account.SECURITIES_ACCOUNT]: CircleDollarSign,
  [Account.OTHER]: Wallet,
};

const DynamicIcon = ({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) => {
  const Icon = ACCOUNT_ICONS[name];
  if (!Icon) return null;
  return <Icon className={className} />;
};

interface AccountListProps {
  accounts: AccountType[];
}

function CollapsibleAccountGroup({
  type,
  accounts,
  onEdit,
  onDelete,
}: {
  type: Account;
  accounts: AccountType[];
  onEdit: (account: AccountType) => void;
  onDelete: (account: AccountType) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const Icon = accountIcons[type] || Wallet;
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <>
      <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden">
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
            <Badge
              variant="secondary"
              className="ml-2 hidden md:inline-flex bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
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
            {accounts.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            {accounts.length === 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8"></Button>
            )}
          </div>
        </div>

        {accounts.length > 0 && isOpen && (
          <div className="border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
            {accounts.map((account, index) => (
              <div key={account.id}>
                <div className="flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group border-b border-transparent last:border-0 hover:border-slate-200 dark:hover:border-white/5">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-1.5 h-10 rounded-full"
                      style={{ backgroundColor: account.color || 'gray' }}
                    />
                    <div className="p-2 bg-muted/50 rounded-full">
                      <DynamicIcon
                        name={(account.icon as IconName) || 'wallet'}
                        className="h-5 w-5 text-muted-foreground"
                      />
                    </div>
                    <div>
                      <div className="font-medium">{account.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        'font-bold font-mono tracking-tight',
                        account.balance < 0
                          ? 'text-red-500'
                          : 'text-foreground',
                      )}
                    >
                      ${account.balance.toLocaleString()}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(account);
                          }}
                        >
                          編輯
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(account);
                          }}
                        >
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* {index < accounts.length - 1 && <Separator className="bg-slate-200 dark:bg-white/5" />} */}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function AccountList({ accounts }: AccountListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] =
    useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountType | null>(
    null,
  );

  const handleCreate = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (account: AccountType) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = (account: AccountType) => {
    setSelectedAccount(account);
    setIsDeleteConfirmDialogOpen(true);
  };

  const groupedAccounts = accounts.reduce(
    (acc, account) => {
      const type = account.type as Account;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(account);
      return acc;
    },
    {} as Record<string, AccountType[]>,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-end space-y-2">
        {/* <h2 className="text-3xl font-bold tracking-tight">帳戶管理</h2> */}

        <div className="flex items-center gap-2">
          {/* <ExcelImportButton type={PageType.ACCOUNTS} />
          <ExcelExportButton type={PageType.ACCOUNTS} /> */}
          <Button
            className="cursor-pointer bg-slate-900 dark:bg-slate-50 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-xl shadow-slate-300/50 dark:shadow-none border-0 transition-all duration-300 transform hover:scale-105 rounded-full px-6 h-11 text-sm font-medium font-playfair tracking-wide"
            onClick={handleCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            新增帳戶
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {accountTypeOrder.map((type) => {
          const typeAccounts = groupedAccounts[type] || [];

          return (
            <CollapsibleAccountGroup
              key={type}
              type={type as Account}
              accounts={typeAccounts}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          );
        })}
      </div>

      <AccountDialog
        selectedAccount={selectedAccount}
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
      />
      <AccountDeleteConfirmDialog
        isDeleteConfirmDialogOpen={isDeleteConfirmDialogOpen}
        setIsDeleteConfirmDialogOpen={setIsDeleteConfirmDialogOpen}
        account={selectedAccount}
      />
    </div>
  );
}

export default AccountList;
