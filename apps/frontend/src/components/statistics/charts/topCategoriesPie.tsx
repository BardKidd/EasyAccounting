'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import useDark from '@/hooks/useDark';
import { OverviewTop3CategoriesType } from '@repo/shared';

interface TopCategoriesPieProps {
  totalExpense: number;
  categories: OverviewTop3CategoriesType[];
}

export function TopCategoriesPie({
  totalExpense,
  categories,
}: TopCategoriesPieProps) {
  const isDark = useDark();

  const getOption = (category: OverviewTop3CategoriesType) => {
    const percentage = ((category.amount / totalExpense) * 100).toFixed(1);
    const rest = totalExpense - category.amount;

    return {
      title: {
        text: `${percentage}%`,
        left: 'center',
        top: 'center',
        textStyle: {
          color: isDark ? '#fff' : '#333',
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['60%', '75%'], // 圓形寬度只會剩 15%
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            scale: false,
            label: {
              show: false,
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            {
              value: category.amount,
              name: category.category.name,
              itemStyle: {
                color: category.category.color,
              },
            },
            {
              value: rest,
              name: '其他',
              itemStyle: {
                color: isDark ? '#374151' : '#e5e7eb',
              },
              tooltip: { show: false },
            },
          ],
        },
      ],
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark
          ? 'rgba(15, 23, 42, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontFamily: 'Geist Mono',
        },
        padding: [8, 12],
        formatter: (params: any) => {
          if (params.name === '其他') return '';
          return `
            <div class="flex flex-col gap-1">
               <span class="font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}">${params.name}</span>
               <span class="font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}">${formatCurrency(params.value)} <span class="text-xs font-normal opacity-70">(${params.percent}%)</span></span>
            </div>
          `;
        },
        extraCssText:
          'backdrop-filter: blur(8px); border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
      },
    };
  };

  return (
    <Card className="h-full border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group dark:shadow-teal-glow">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-lg font-bold font-playfair text-slate-900 dark:text-white">
          支出類別 Top 3
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {categories.slice(0, 3).map((cat, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300"
            >
              <div className="w-full h-[150px]">
                <ReactECharts
                  option={getOption(cat)}
                  style={{ height: '100%', width: '100%' }}
                  notMerge
                />
              </div>
              <div className="text-center mt-4 space-y-1">
                <div className="font-bold text-sm text-slate-700 dark:text-slate-200 font-playfair">
                  {cat.category.name}
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {formatCurrency(cat.amount)}
                </div>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground py-10 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded"></div>
              </div>
              <p>尚無支出資料</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
