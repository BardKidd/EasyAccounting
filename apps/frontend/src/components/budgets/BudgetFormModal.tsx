'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BudgetForm, BudgetFormData } from './BudgetForm';
import { UpdateConfirmationModal } from './UpdateConfirmationModal';
import { Budget } from '@/types/budget';
import { budgetService } from '@/services/mock/budgetMock';
import { useState } from 'react';
import { toast } from 'sonner';

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Budget;
}

export function BudgetFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: BudgetFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<BudgetFormData | null>(null);

  const handleCreate = async (data: BudgetFormData) => {
    setIsLoading(true);
    try {
      const res = await budgetService.createBudget({
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      });
      if (res.isSuccess) {
        toast.success('預算建立成功');
        onSuccess();
        onClose();
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error('建立失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (
    id: number,
    data: BudgetFormData,
    effectiveFrom?: 'immediate' | 'nextPeriod'
  ) => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { startDate, ...rest } = data;
      const res = await budgetService.updateBudget(id, {
        ...rest,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        effectiveFrom,
      });
      if (res.isSuccess) {
        toast.success('預算更新成功');
        onSuccess();
        onClose();
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error('更新失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: BudgetFormData) => {
    if (initialData) {
      // Check if amount changed
      if (data.amount !== initialData.amount) {
        setPendingData(data);
        setShowConfirm(true);
        return;
      }
      await handleUpdate(initialData.id, data);
    } else {
      await handleCreate(data);
    }
  };

  const handleConfirmUpdate = async (choice: 'immediate' | 'nextPeriod') => {
    if (initialData && pendingData) {
      await handleUpdate(initialData.id, pendingData, choice);
      setShowConfirm(false);
      setPendingData(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{initialData ? '編輯預算' : '建立新預算'}</DialogTitle>
            <DialogDescription>
              設定您的預算計畫，以控制支出。
            </DialogDescription>
          </DialogHeader>
          <BudgetForm
            initialData={initialData}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {initialData && pendingData && (
        <UpdateConfirmationModal
          isOpen={showConfirm}
          onClose={() => {
            setShowConfirm(false);
            setPendingData(null);
          }}
          onConfirm={handleConfirmUpdate}
          oldAmount={initialData.amount}
          newAmount={pendingData.amount}
        />
      )}
    </>
  );
}