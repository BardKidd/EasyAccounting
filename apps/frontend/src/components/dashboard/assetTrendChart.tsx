'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useDark from '@/hooks/useDark';

interface AssetTrendData {
  year: string;
  month: string;
  income: number;
  expense: number;
  netFlow: number;
  balance: number;
}

interface AssetTrendChartProps {
  data: AssetTrendData[];
  isLoading?: boolean;
}

export default function AssetTrendChart({
  data,
  isLoading,
}: AssetTrendChartProps) {
  const isDark = useDark();

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
    },
    legend: {
      data: ['收入', '支出', '總資產'],
      top: 0,
      textStyle: {
        color: isDark ? '#edeeee' : '#374151',
      },
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        startValue: Math.max(0, data.length - 12), // 至少展示 12 個月
        endValue: data.length - 1,
        bottom: 10,
        height: 20,
        borderColor: 'transparent',
        // AI 寫的 SVG 向量圖...
        handleIcon:
          'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '80%',
        handleStyle: {
          color: '#fff',
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
        textStyle: {
          color: isDark ? '#edeeee' : '#374151',
        },
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        startValue: Math.max(0, data.length - 12),
        endValue: data.length - 1,
      },
    ],
    grid: {
      top: '15%',
      left: '3%',
      right: '3%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: true,
        data: data.map((item) => `${item.year}-${item.month}`),
        axisLabel: {
          formatter: function (value: string) {
            const [year, month] = value.split('-');
            if (month === '1') {
              return year;
            }
            return `${month}月`;
          },
          color: isDark ? '#9ca3af' : '#4b5563',
        },
        axisLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb',
          },
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '收支',
        axisLabel: {
          color: isDark ? '#9ca3af' : '#4b5563',
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb',
          },
        },
      },
      {
        type: 'value',
        name: '總資產',
        axisLabel: {
          color: isDark ? '#9ca3af' : '#4b5563',
        },
        splitLine: {
          show: false, // 只顯示收支的，不然好亂...
        },
      },
    ],
    series: [
      {
        name: '收入',
        type: 'bar',
        emphasis: {
          focus: 'series',
        },
        itemStyle: {
          color: '#10b981', // Green
        },
        data: data.map((item) => item.income),
      },
      {
        name: '支出',
        type: 'bar',
        emphasis: {
          focus: 'series',
        },
        itemStyle: {
          color: '#ef4444', // Red
        },
        data: data.map((item) => item.expense),
      },
      {
        name: '總資產',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        itemStyle: {
          color: '#8b5cf6', // Purple
        },
        lineStyle: {
          width: 3,
        },
        data: data.map((item) => item.balance),
      },
    ],
  };

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>總資產趨勢</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] w-full flex items-center justify-center bg-muted/10 animate-pulse rounded-lg">
            載入中...
          </div>
        ) : (
          <ReactECharts
            option={option}
            style={{ height: '350px', width: '100%' }}
            notMerge
          />
        )}
      </CardContent>
    </Card>
  );
}
