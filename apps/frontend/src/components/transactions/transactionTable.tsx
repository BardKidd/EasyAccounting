'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TransactionResponse,
  RootType,
  CategoryType,
  AccountType,
} from '@repo/shared';
import CustomPagination from '@/components/customPagination';
import { format } from 'date-fns';
import { ArrowRightLeft, ArrowRight } from 'lucide-react';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';

interface TransactionTableProps {
  transactions: TransactionResponse;
  categories: CategoryType[];
  accounts: AccountType[];
}

function TransactionTable({
  transactions,
  categories,
  accounts,
}: TransactionTableProps) {
  const getCategoryName = (id: string) => {
    // id -> name
    const categoryMap = new Map<string, string>();
    categories.forEach((rootCat) => {
      categoryMap.set(rootCat.id, rootCat.name);
      if (rootCat.children && rootCat.children.length > 0) {
        const mainCat = rootCat.children;
        mainCat.forEach((main) => {
          categoryMap.set(main.id, main.name);
          if (main.children && main.children.length > 0) {
            const subCat = main.children;
            subCat.forEach((sub) => {
              categoryMap.set(sub.id, sub.name);
            });
          }
        });
      }
    });

    return categoryMap.get(id) || '未分類';
  };

  const getAccount = (id: string) => {
    return accounts.find((a) => a.id === id);
  };

  // 判斷是否為轉帳：有 targetAccountId
  const isTransfer = (item: any) => !!item.targetAccountId;

  const formatAmount = (item: any) => {
    const formatted = Math.abs(item.amount).toLocaleString();

    // 轉帳顯示橙黃色，不帶正負號
    if (isTransfer(item)) {
      return <span className="text-orange-500 font-medium">{formatted}</span>;
    }

    if (item.type === RootType.EXPENSE) {
      return <span className="text-rose-600 font-medium">-{formatted}</span>;
    }
    if (item.type === RootType.INCOME) {
      return <span className="text-emerald-600 font-medium">+{formatted}</span>;
    }
    return <span className="text-slate-600 font-medium">{formatted}</span>;
  };

  if (transactions?.items?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/20 h-64">
        <ArrowRightLeft className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">尚無交易紀錄</h3>
        <p className="text-sm text-muted-foreground mt-1">
          試著新增一筆交易或調整篩選條件
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">日期</TableHead>
            <TableHead className="w-[100px]">類型</TableHead>
            <TableHead className="w-[120px]">分類</TableHead>
            <TableHead className="w-[200px]">帳戶</TableHead>
            <TableHead>備註</TableHead>
            <TableHead className="text-right w-[120px]">金額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions?.items?.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {format(new Date(transaction.date), 'yyyy-MM-dd')}
                <div className="text-xs text-muted-foreground">
                  {transaction.time}
                </div>
              </TableCell>
              <TableCell>
                {isTransfer(transaction) ? RootType.OPERATE : transaction.type}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{getCategoryName(transaction.categoryId)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {/* Source Account */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const account = getAccount(transaction.accountId);
                      if (!account) return <span>未知帳戶</span>;
                      const Icon = ACCOUNT_ICONS[account.icon as IconName];
                      return (
                        <>
                          {Icon && (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{account.name}</span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Target Account */}
                  {transaction.targetAccountId && (
                    <div className="flex items-center gap-2 text-muted-foreground pl-2">
                      <span className="text-xs">to</span>
                      {(() => {
                        const targetAccount = getAccount(
                          transaction.targetAccountId!
                        );
                        if (!targetAccount) return <span>未知帳戶</span>;
                        const TargetIcon =
                          ACCOUNT_ICONS[targetAccount.icon as IconName];
                        return (
                          <>
                            {TargetIcon && <TargetIcon className="h-4 w-4" />}
                            <span>{targetAccount.name}</span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {transaction.description || '-'}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(transaction)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CustomPagination pagination={transactions.pagination} />
    </div>
  );
}

export default TransactionTable;
