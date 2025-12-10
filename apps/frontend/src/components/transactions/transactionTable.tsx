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
  TransactionType,
  MainType,
  CategoryType,
  AccountType,
} from '@repo/shared';
import { format } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';

interface TransactionTableProps {
  transactions: TransactionType[];
  categories: CategoryType[];
  accounts: AccountType[];
}

function TransactionTable({
  transactions,
  categories,
  accounts,
}: TransactionTableProps) {
  const getCategoryName = (id: string) => {
    // Flatten categories to search
    // Assuming categories prop is the root categories list which contain subCategories
    // We need to search recursively or flat list.
    // The `categories` from service usually has subCategories.

    // Simple search helper
    for (const cat of categories) {
      if (cat.id === id) return cat.name;
      if (cat.children) {
        const sub = cat.children.find((s: CategoryType) => s.id === id);
        if (sub) return sub.name;
      }
    }
    return '未分類';
  };

  const getAccount = (id: string) => {
    return accounts.find((a) => a.id === id);
  };

  const formatAmount = (amount: number, type: MainType) => {
    const formatted = Math.abs(amount).toLocaleString();
    if (type === MainType.EXPENSE) {
      return <span className="text-rose-600 font-medium">-{formatted}</span>;
    }
    if (type === MainType.INCOME) {
      return <span className="text-emerald-600 font-medium">+{formatted}</span>;
    }
    return <span className="text-slate-600 font-medium">{formatted}</span>;
  };

  if (transactions.length === 0) {
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
            <TableHead className="w-[150px]">帳戶</TableHead>
            <TableHead>備註</TableHead>
            <TableHead className="text-right w-[120px]">金額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id || Math.random()}>
              <TableCell>
                {format(new Date(transaction.date), 'yyyy-MM-dd')}
                <div className="text-xs text-muted-foreground">
                  {transaction.time}
                </div>
              </TableCell>
              <TableCell>{transaction.type}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{getCategoryName(transaction.categoryId)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {(() => {
                    const account = getAccount(transaction.accountId);
                    if (!account) return '未知帳戶';

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
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {transaction.description || '-'}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(transaction.amount, transaction.type)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default TransactionTable;
