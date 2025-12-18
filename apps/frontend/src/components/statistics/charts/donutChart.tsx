'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import useDark from '@/hooks/useDark';

interface CategoryPieData {
  name: string;
  value: number;
  color: string;
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
        color: isDark ? '#374151' : '#cbd5e1',
      });
    }

    const innerSeriesData = finalData.map((item) => ({
      value: item.value, // <- 其實主要模板資訊就是看 value, name 後得出來的結果
      name: item.name,
      itemStyle: { color: item.color },
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
          return `${params.name}: ${formatCurrency(params.value)} (${params.percent}%)`;
        },
        backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? '#333' : '#ccc',
        textStyle: {
          color: isDark ? '#fff' : '#333',
        },
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
          minAngle: 15, // 最小角度，避免過小的扇形
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
          minAngle: 15,
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
    <Card>
      <CardHeader>
        <CardTitle>類別佔比</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: '350px' }} />
      </CardContent>
    </Card>
  );
}
