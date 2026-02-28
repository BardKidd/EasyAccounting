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
        className="cursor-pointer bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 border-0 transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105 rounded-full px-6 h-11 text-sm font-medium tracking-wide"
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
