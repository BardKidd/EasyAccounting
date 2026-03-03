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
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getErrorMessage } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';
import AccountDialog from '@/components/accounts/accountDialog';
import AccountDeleteConfirmDialog from '@/components/accounts/accountDeleteConfirmDialog';
import AccountArchiveConfirmDialog from '@/components/accounts/accountArchiveConfirmDialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Archive, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import services from '@/services';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
// import { ExcelExportButton } from '@/components/common/ExcelExportButton';
// import { ExcelImportButton } from '@/components/common/ExcelImportButton';

// 順序
const accountTypeOrder = [
  Account.CASH,
  Account.BANK,
  Account.CREDIT_CARD,
  Account.SECURITIES_ACCOUNT,
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
  onArchive,
  onUnarchive,
}: {
  type: Account;
  accounts: AccountType[];
  onEdit: (account: AccountType) => void;
  onDelete: (account: AccountType) => void;
  onArchive: (account: AccountType) => void;
  onUnarchive: (account: AccountType) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const Icon = accountIcons[type] || Wallet;
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <>
      <Card className="border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl rounded-3xl shadow-xl overflow-hidden transition-all duration-300 group">
        <div
          className="flex items-center justify-between p-5 md:p-6 cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
              <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {type}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 md:hidden mt-0.5">
                ${totalBalance.toLocaleString()}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="ml-2 hidden md:inline-flex bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-lg px-2"
            >
              {accounts.length}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="font-bold text-lg text-slate-800 dark:text-slate-100 font-mono tracking-tight">
                ${totalBalance.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                總資產
              </div>
            </div>
            {accounts.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 cursor-pointer transition-transform duration-300"
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <ChevronDown className="h-5 w-5 text-slate-500" />
              </Button>
            )}
            {accounts.length === 0 && <div className="h-10 w-10"></div>}
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
              <div className="px-5 md:px-6 pb-5 md:pb-6 pt-2 space-y-3 relative">
                {/* Subtle inner top border using absolute positioning to avoid padding issues */}
                <div className="absolute top-0 left-6 right-6 h-px bg-slate-200/50 dark:bg-white/10"></div>

                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 bg-white/80 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/50 dark:border-white/5 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all duration-300 cursor-default group/item transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        data-testid="account-color"
                        className="w-1.5 h-10 rounded-full"
                        style={{ backgroundColor: account.color || 'gray' }}
                      />
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
                        <DynamicIcon
                          name={(account.icon as IconName) || 'wallet'}
                          className="h-5 w-5 text-slate-500 dark:text-slate-400"
                        />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {account.name}
                          {account.isArchived && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 bg-slate-100 dark:bg-slate-800 text-slate-500"
                            >
                              已封存
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        data-testid="account-balance"
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
                            <Pencil className="mr-2 h-4 w-4" />
                            編輯
                          </DropdownMenuItem>

                          {account.isArchived ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnarchive(account);
                              }}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              解除封存
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchive(account);
                              }}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              封存帳戶
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            className="text-destructive cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(account);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            刪除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </>
  );
}

function AccountList({ accounts }: AccountListProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] =
    useState(false);
  const [isArchiveConfirmDialogOpen, setIsArchiveConfirmDialogOpen] =
    useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountType | null>(
    null,
  );
  const [showArchived, setShowArchived] = useState(false);

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

  const handleArchive = (account: AccountType) => {
    setSelectedAccount(account);
    setIsArchiveConfirmDialogOpen(true);
  };

  const handleUnarchive = async (account: AccountType) => {
    try {
      if (!account.id) return;
      await services.unarchiveAccount(account.id);
      toast.success('帳戶已解除封存');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filteredAccounts = showArchived
    ? accounts
    : accounts.filter((a) => !a.isArchived);

  const groupedAccounts = filteredAccounts.reduce(
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
      <div className="flex items-end justify-between space-y-2">
        <div className="flex items-center space-x-2 bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label
            htmlFor="show-archived"
            className="text-sm cursor-pointer text-slate-600 dark:text-slate-400"
          >
            顯示已封存帳戶
          </Label>
        </div>

        <div className="flex items-center gap-2">
          {/* <ExcelImportButton type={PageType.ACCOUNTS} />
          <ExcelExportButton type={PageType.ACCOUNTS} /> */}
          <Button
            className="cursor-pointer bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 border-0 transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105 rounded-full px-6 h-11 text-sm font-medium tracking-wide"
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
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
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
      <AccountArchiveConfirmDialog
        isArchiveConfirmDialogOpen={isArchiveConfirmDialogOpen}
        setIsArchiveConfirmDialogOpen={setIsArchiveConfirmDialogOpen}
        account={selectedAccount}
      />
    </div>
  );
}

export default AccountList;
