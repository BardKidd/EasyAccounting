'use client';

import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SummaryData {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  balance: number;
}

enum SummaryType {
  INCOME = '收入',
  EXPENSE = '支出',
  TRANSFER_IN = '轉入',
  TRANSFER_OUT = '轉出',
  BALANCE = '結餘',
}

export function SummaryBarChart({ data }: { data: SummaryData }) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';

  const getColors = () => ({
    [SummaryType.INCOME]: '#10b981', // emerald-500
    [SummaryType.EXPENSE]: '#ef4444', // red-500
    [SummaryType.TRANSFER_IN]: '#3b82f6', // blue-500
    [SummaryType.TRANSFER_OUT]: '#f59e0b', // amber-500
    [SummaryType.BALANCE]: '#8b5cf6', // violet-500
  });

  const getSortedKeys = () => [
    SummaryType.BALANCE,
    SummaryType.TRANSFER_OUT,
    SummaryType.TRANSFER_IN,
    SummaryType.EXPENSE,
    SummaryType.INCOME,
  ];

  const buildSeriesData = () => {
    const keys = getSortedKeys();
    const colors = getColors();

    return keys.map((key) => {
      let rawValue = 0;
      let prefix = '';

      switch (key) {
        case SummaryType.INCOME:
          rawValue = data.income;
          prefix = '+';
          break;
        case SummaryType.EXPENSE:
          rawValue = data.expense;
          prefix = '-';
          break;
        case SummaryType.TRANSFER_IN:
          rawValue = data.transferIn;
          prefix = '+';
          break;
        case SummaryType.TRANSFER_OUT:
          rawValue = data.transferOut;
          prefix = '-';
          break;
        case SummaryType.BALANCE:
          rawValue = data.balance;
          prefix = rawValue > 0 ? '+' : rawValue < 0 ? '-' : '';
          break;
      }

      // 會先判斷 typeof 是否是 colors 這個物件資料，再判斷是不是 colors 這個物件的 key。
      const color = colors[key as keyof typeof colors];

      return {
        value: rawValue,
        name: key,
        itemStyle: {
          color,
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color,
          formatter: (p: any) => {
            const valStr = formatCurrency(p.value);
            return `${prefix} ${valStr}`;
          },
          fontWeight: 'bold',
          fontSize: 14,
        },
      };
    });
  };

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const item = params[0];
        let prefix = '';
        if ([SummaryType.INCOME, SummaryType.TRANSFER_IN].includes(item.name))
          prefix = '+';
        if ([SummaryType.EXPENSE, SummaryType.TRANSFER_OUT].includes(item.name))
          prefix = '-';
        if (item.name === SummaryType.BALANCE)
          prefix = item.value > 0 ? '+' : '';

        return `${item.name}<br/>${item.marker} ${prefix} ${formatCurrency(item.value)}`;
      },
      backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
      borderColor: isDark ? '#333' : '#ccc',
      textStyle: {
        color: isDark ? '#fff' : '#333',
      },
    },
    grid: {
      left: '3%',
      right: '15%', // Increase right margin to fit longer labels (+ $xx,xxx)
      bottom: '3%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value', // 數值軸
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 10000) return `${value / 10000}萬`;
          return value;
        },
        color: isDark ? '#9ca3af' : '#6b7280',
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb',
        },
      },
    },
    yAxis: {
      type: 'category', // 類別軸
      data: getSortedKeys(),
      axisLabel: {
        color: isDark ? '#ffffff' : '#374151',
        fontWeight: 'bold',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: buildSeriesData(),
        barWidth: '60%',
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">收支概況</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts
          option={option}
          style={{ height: '300px', width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}
