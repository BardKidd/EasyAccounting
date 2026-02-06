'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionSheet } from './transactionSheet';
import { CategoryType, AccountType } from '@repo/shared';

interface CreateTransactionButtonProps {
  categories: CategoryType[];
  accounts: AccountType[];
}

export function CreateTransactionButton({
  categories,
  accounts,
}: CreateTransactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer bg-slate-900 dark:bg-slate-50 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-xl shadow-slate-300/50 dark:shadow-none border-0 transition-all duration-300 transform hover:scale-105 rounded-full px-6 h-11 text-sm font-medium font-playfair tracking-wide"
      >
        <Plus className="mr-2 h-4 w-4" /> 新增交易
      </Button>
      <TransactionSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        categories={categories}
        accounts={accounts}
      />
    </>
  );
}
