'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UpdateAccountInput } from '@repo/shared';
import AccountForm from '@/components/accounts/accountForm';

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
  console.log('selectedAccount', selectedAccount);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '編輯帳戶' : '新增帳戶'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `${selectedAccount?.name}帳戶資訊修改`
              : '建立一個新的資產帳戶以追蹤您的資金流向。'}
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          selectedAccount={selectedAccount}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

export default AccountDialog;
