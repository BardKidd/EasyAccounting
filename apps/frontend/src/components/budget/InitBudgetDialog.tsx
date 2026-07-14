'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { AccountType } from '@repo/shared';
import { Account as AccountEnum } from '@repo/shared';

interface InitBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountType[];
  onInit: (
    startMonth: string,
    accountOverrides: Array<{ accountId: string; onBudget: boolean }>,
  ) => Promise<void>;
}

const defaultOnBudget = (type: string) =>
  type === AccountEnum.CASH ||
  type === AccountEnum.BANK ||
  type === AccountEnum.CREDIT_CARD;

export function InitBudgetDialog({
  open,
  onOpenChange,
  accounts,
  onInit,
}: InitBudgetDialogProps) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // accounts 由父層非同步載入後才傳入，useState 初始化只跑一次會吃到空陣列，
  // 故在 accounts 變動時同步（保留使用者已勾選的值）
  useEffect(() => {
    setOverrides((prev) => {
      const m: Record<string, boolean> = {};
      for (const acc of accounts) {
        m[acc.id] = prev[acc.id] ?? acc.onBudget ?? defaultOnBudget(acc.type);
      }
      return m;
    });
  }, [accounts]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const accountOverrides = accounts.map((acc) => ({
        accountId: acc.id,
        onBudget: overrides[acc.id] ?? defaultOnBudget(acc.type),
      }));
      await onInit(startMonth, accountOverrides);
      toast.success('預算已啟用！');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || '啟用失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-outfit text-slate-800 dark:text-slate-100">
            啟用預算
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            選擇預算起始月份，並確認哪些帳戶參與預算。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Start Month */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              起始月份
            </Label>
            <Input
              type="month"
              value={startMonth.slice(0, 7)} // YYYY-MM
              onChange={(e) => setStartMonth(`${e.target.value}-01`)}
              className="h-10"
            />
          </div>

          {/* Account Overrides */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              參與預算的帳戶 (On-budget)
            </Label>
            <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border border-slate-200/50 dark:border-white/10 p-3">
              {accounts
                .filter((a) => !a.isArchived)
                .map((acc) => (
                  <label
                    key={acc.id}
                    className="flex items-center gap-3 p-2 min-h-[44px] md:min-h-0 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={overrides[acc.id] ?? false}
                      onCheckedChange={(checked) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [acc.id]: !!checked,
                        }))
                      }
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {acc.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                        {acc.type}
                      </span>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            {loading ? '啟用中...' : '啟用預算'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
