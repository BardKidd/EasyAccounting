'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import useDark from '@/hooks/useDark';
import { RootType } from '@repo/shared';

interface CategoryPieData {
  name: string;
  value: number;
  color: string;
  type: RootType | '其他';
}

interface CategoryPieChartProps {
  data: CategoryPieData[];
  totalAmount: number;
}

export function DonutChart({ data, totalAmount }: CategoryPieChartProps) {
  const isDark = useDark();

  const option = useMemo(() => {
    // 最多顯示六個，超過的都合併為一個“其他”
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const top6 = sortedData.slice(0, 6);
    const rest = sortedData.slice(6);
    const otherAmount = rest.reduce((sum, item) => sum + item.value, 0);

    const finalData = [...top6];
    if (otherAmount > 0) {
      finalData.push({
        name: '其他',
        value: otherAmount,
        color: isDark ? '#475569' : '#cbd5e1',
        type: '其他',
      });
    }

    const innerSeriesData = finalData.map((item) => ({
      value: item.value, // <- 其實主要模板資訊就是看 value, name 後得出來的結果
      name: item.name,
      itemStyle: { color: item.color },
      type: item.type,
      label: {
        show: true,
        position: 'inside',
        formatter: '{b}', // 模板變數，{b} 表示name
        color: '#fff',
        fontWeight: 'bold',
        textBorderColor: 'transparent',
      },
    }));

    const outerSeriesData = finalData.map((item) => ({
      value: item.value,
      name: item.name,
      itemStyle: { color: 'transparent' },
      label: {
        show: true,
        position: 'outside',
        formatter: '{d}%', // {d} 表示百分比，EChart 自己計算出來的
        color: isDark ? '#fff' : '#333',
        fontWeight: 'bold',
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 10,
        lineStyle: {
          color: isDark ? '#666' : '#ccc',
        },
      },
      silent: true,
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesIndex !== 0) return '';
          const prefix = params.data.type === RootType.EXPENSE ? '-' : '';
          return `
            <div class="flex flex-col gap-1">
               <span class="font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}">${params.name}</span>
               <span class="font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}">${prefix}${formatCurrency(params.value)} <span class="text-xs font-normal opacity-70">(${params.percent}%)</span></span>
            </div>
          `;
        },
        backgroundColor: isDark
          ? 'rgba(15, 23, 42, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontFamily: 'Geist Mono',
        },
        padding: [8, 12],
        extraCssText:
          'backdrop-filter: blur(8px); border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
      },
      legend: {
        show: false,
      },
      series: [
        {
          name: 'Category Distribution',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: true,
          minAngle: 5, // 最小角度，避免過小的扇形
          data: innerSeriesData,
          itemStyle: {
            borderColor: isDark ? '#1f2937' : '#fff',
            borderWidth: 2,
          },
        },
        {
          name: 'Percentage Labels',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: true,
          minAngle: 5,
          data: outerSeriesData,
          z: 0,
        },
      ],
      // 甜甜圈設定
      graphic: {
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: formatCurrency(totalAmount),
          textAlign: 'center',
          fill: isDark ? '#fff' : '#333',
          fontSize: 20,
          fontWeight: 'bold',
        },
      },
    };
  }, [data, totalAmount, isDark]);

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white">
          統計佔比
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ReactECharts option={option} style={{ height: '350px' }} />
      </CardContent>
    </Card>
  );
}
