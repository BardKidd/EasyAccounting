'use client';

import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface CategoryData {
  name: string;
  amount: number;
  color: string;
}

interface TopCategoriesPieProps {
  totalExpense: number;
  categories: CategoryData[];
}

export function TopCategoriesPie({
  totalExpense,
  categories,
}: TopCategoriesPieProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';

  const getOption = (category: CategoryData) => {
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
              name: category.name,
              itemStyle: {
                color: category.color,
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
        formatter: (params: any) => {
          if (params.name === '其他') return '';
          return `${params.name}: ${formatCurrency(params.value)} (${params.percent}%)`;
        },
      },
    };
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>支出類別 Top 3</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.slice(0, 3).map((cat, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="w-full h-[150px]">
                <ReactECharts
                  option={getOption(cat)}
                  style={{ height: '100%', width: '100%' }}
                  notMerge
                />
              </div>
              <div className="text-center mt-2">
                <div className="font-semibold text-sm">{cat.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(cat.amount)}
                </div>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground py-10">
              尚無支出資料
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
