'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import useDark from '@/hooks/useDark';

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
  const isDark = useDark();

  const getColors = () => ({
    [SummaryType.INCOME]: '#14b8a6', // teal-500
    [SummaryType.EXPENSE]: '#f43f5e', // rose-500
    [SummaryType.TRANSFER_IN]: '#0ea5e9', // sky-500
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
      let isBalanceNegative = false;

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
          isBalanceNegative = data.balance < 0;
          rawValue = Math.abs(data.balance);
          prefix = isBalanceNegative ? '-' : '+';
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
      backgroundColor: isDark
        ? 'rgba(15, 23, 42, 0.95)'
        : 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: isDark ? '#f8fafc' : '#0f172a',
        fontFamily: 'Geist Mono',
      },
      padding: [12, 16],
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      formatter: (params: any[]) => {
        const item = params[0];
        let prefix = '';
        if ([SummaryType.INCOME, SummaryType.TRANSFER_IN].includes(item.name))
          prefix = '+';
        if ([SummaryType.EXPENSE, SummaryType.TRANSFER_OUT].includes(item.name))
          prefix = '-';
        if (item.name === SummaryType.BALANCE)
          prefix = item.value > 0 ? '+' : '';

        const color = item.color.colorStops
          ? item.color.colorStops[0].color
          : item.color;

        return `
            <div class="flex items-center justify-between gap-4 text-xs font-mono">
              <span class="flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}">
                <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
                ${item.name}
              </span>
              <span class="font-bold ${isDark ? 'text-white' : 'text-slate-900'}">${prefix} ${formatCurrency(item.value)}</span>
            </div>
          `;
      },
      extraCssText:
        'backdrop-filter: blur(8px); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 10000) return `${value / 10000}萬`;
          return value;
        },
        color: isDark ? '#64748b' : '#94a3b8',
        fontFamily: 'Geist Mono',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: getSortedKeys(),
      axisLabel: {
        color: isDark ? '#f8fafc' : '#0f172a',
        fontWeight: 'bold',
        fontFamily: 'Inter',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: buildSeriesData().map((item) => ({
          ...item,
          itemStyle: {
            ...item.itemStyle,
            color:
              item.itemStyle.color === '#14b8a6'
                ? {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 1,
                    y2: 0,
                    colorStops: [
                      { offset: 0, color: '#14b8a6' },
                      { offset: 1, color: '#2dd4bf' },
                    ],
                  }
                : item.itemStyle.color === '#f43f5e'
                  ? {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 0,
                      colorStops: [
                        { offset: 0, color: '#f43f5e' },
                        { offset: 1, color: '#fb7185' },
                      ],
                    }
                  : item.itemStyle.color,
          },
        })),
        barWidth: '50%',
        showBackground: true,
        backgroundStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  };

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group dark:shadow-teal-glow">
      <CardHeader className="pb-2 border-b border-slate-200 dark:border-white/5">
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white">
          收支概況
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ReactECharts
          option={option}
          style={{ height: '300px', width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}
