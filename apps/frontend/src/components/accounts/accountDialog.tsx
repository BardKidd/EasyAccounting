'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UpdateAccountInput, Account } from '@repo/shared';
import AccountForm from '@/components/accounts/accountForm';
import { useState } from 'react';

function AccountDialog({
  selectedAccount,
  isOpen,
  setIsOpen,
}: {
  selectedAccount?: UpdateAccountInput | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const isEditMode = !!selectedAccount;

  const [currentAccountType, setCurrentAccountType] = useState<Account>(
    (selectedAccount?.type as Account) || Account.CASH,
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={
          currentAccountType === Account.CREDIT_CARD
            ? 'sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl border-slate-200 dark:border-white/10 shadow-2xl'
            : 'sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl border-slate-200 dark:border-white/10 shadow-2xl'
        }
      >
        <DialogHeader className="border-b border-slate-200/50 dark:border-white/5 pb-4 mb-2">
          <DialogTitle className="text-2xl font-bold font-playfair text-slate-900 dark:text-slate-50">
            {isEditMode ? '編輯帳戶' : '新增帳戶'}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {isEditMode
              ? `${selectedAccount?.name}帳戶資訊修改`
              : '建立一個新的資產帳戶以追蹤您的資金流向。'}
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          selectedAccount={selectedAccount}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          onTypeChange={setCurrentAccountType}
        />
      </DialogContent>
    </Dialog>
  );
}

export default AccountDialog;
