'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SEED_CURRENCIES } from '@repo/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { checkSession, changeBaseCurrency } from '@/services/authService';

const labelOf = (code: string) => {
  const c = SEED_CURRENCIES.find((x) => x.code === code);
  return c ? `${c.code}（${c.name}）` : code;
};

export function CurrencySettings() {
  const [baseCode, setBaseCode] = useState<string>('TWD');
  const [selected, setSelected] = useState<string>('TWD');
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkSession()
      .then((res) => {
        if (!mounted) return;
        const code = (res?.data as any)?.baseCurrencyCode || 'TWD';
        setBaseCode(code);
        setSelected(code);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const doSwitch = async () => {
    setSwitching(true);
    try {
      const res = await changeBaseCurrency(selected);
      if (res.isSuccess) {
        toast.success(
          `本位幣已切換為 ${labelOf(selected)}（重算 ${res.data?.transactionsRecomputed ?? 0} 筆交易）`,
        );
        setBaseCode(selected);
      } else {
        // 缺匯率等業務錯誤：訊息含缺漏清單
        toast.error(res.message || '切換失敗');
        setSelected(baseCode); // 還原選擇
      }
    } catch (err: any) {
      toast.error(err?.message || '切換失敗');
      setSelected(baseCode);
    } finally {
      setSwitching(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>本位幣設定</CardTitle>
        <CardDescription>
          本位幣決定報表、淨值與預算以哪個幣別呈現。切換時會用歷史匯率一次性重算所有交易的本位幣金額；
          若缺少必要匯率，切換會被中止並提示缺漏項目。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            目前本位幣：
          </span>
          <span className="font-medium">{labelOf(baseCode)}</span>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selected}
            onValueChange={setSelected}
            disabled={loading || switching}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="選擇本位幣" />
            </SelectTrigger>
            <SelectContent>
              {SEED_CURRENCIES.filter((c) => c.isActive).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code}（{c.name}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={loading || switching || selected === baseCode}
            onClick={() => setConfirmOpen(true)}
          >
            切換本位幣
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認切換本位幣？</AlertDialogTitle>
            <AlertDialogDescription>
              將本位幣從 <b>{labelOf(baseCode)}</b> 切換為{' '}
              <b>{labelOf(selected)}</b>。系統會用歷史匯率重算所有交易的本位幣金額與預算，
              此操作可能需要一些時間。若缺少必要匯率，切換會被中止且不變更任何資料。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={switching}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doSwitch();
              }}
              disabled={switching}
            >
              {switching ? '切換中…' : '確認切換'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default CurrencySettings;
