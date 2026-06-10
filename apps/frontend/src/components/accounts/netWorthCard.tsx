'use client';

import { useEffect, useState } from 'react';
import { getNetWorth, type NetWorthResult } from '@/services/statistics';
import { formatCurrency } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * 淨值卡片：顯示各幣別餘額小計與換算回本位幣的總額。
 * 單幣使用者只會看到一列（與本位幣相同），多幣使用者看到各幣分解 + 缺匯率提示。
 */
export function NetWorthCard() {
  const [data, setData] = useState<NetWorthResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getNetWorth()
      .then((res) => mounted && setData(res))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !data) return null;

  const multiCurrency = data.byCurrency.length > 1;
  const anyMissing = data.byCurrency.some((c) => c.rateMissing);

  return (
    <Card>
      <CardHeader>
        <CardTitle>淨值（{data.baseCurrencyCode}）</CardTitle>
        <CardDescription>
          各帳戶餘額換算回本位幣的總和
          {anyMissing && '（部分幣別缺匯率，總額未計入）'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold font-mono">
          {formatCurrency(data.totalInBase, data.baseCurrencyCode)}
        </div>
        {multiCurrency && (
          <ul className="space-y-1 text-sm">
            {data.byCurrency.map((c) => (
              <li
                key={c.currencyCode}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-slate-500 dark:text-slate-400">
                  {c.currencyCode}
                </span>
                <span className="font-mono">
                  {formatCurrency(c.balance, c.currencyCode)}
                  {c.rateMissing ? (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      缺匯率
                    </span>
                  ) : (
                    <span className="ml-2 text-slate-400">
                      ≈ {formatCurrency(c.inBase ?? 0, data.baseCurrencyCode)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default NetWorthCard;
