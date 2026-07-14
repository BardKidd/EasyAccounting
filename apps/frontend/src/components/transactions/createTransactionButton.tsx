'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const router = useRouter();

  // 手機底部導覽的中央「+」FAB 會導到 /transactions?new=1，於此自動開啟新增交易 sheet。
  useEffect(() => {
    if (searchParams.get('new') === '1') setIsOpen(true);
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    // 關閉後清掉 ?new=1，保留其餘篩選參數，避免返回/重整時又自動開啟。
    if (searchParams.get('new')) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete('new');
      const qs = params.toString();
      router.replace(`/transactions${qs ? `?${qs}` : ''}`, { scroll: false });
    }
  };

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
        onClose={handleClose}
        categories={categories}
        accounts={accounts}
      />
    </>
  );
}
