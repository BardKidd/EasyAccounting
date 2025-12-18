'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatChartLabel, formatCurrency } from '@/lib/utils';
import useDark from '@/hooks/useDark';

function TrendChart({
  data,
}: {
  data: { type: string; date: string; income: number; expense: number }[];
}) {
  // 如果有使用 enableSystem，而當前 theme 為 system 的話，resolvedTheme 則會協助解析實際上要使用 dark 還是 light。
  const isDark = useDark();

  const hasData = useMemo(() => {
    return data.some((d) => Number(d.income) > 0 || Number(d.expense) > 0);
  }, [data]);

  const chartData = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

    return data.map((d) => {
      let income = d.income;
      let expense = d.expense;

      if (d.type === 'month' && d.date > currentKey) {
        income = null as any;
        expense = null as any;
      }

      return { ...d, income, expense };
    });
  }, [data]);

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const dateStr = params[0].name;
        const type = data[0]?.type || 'month';
        const label = formatChartLabel(dateStr, type);

        let result = `${label}<br/>`;
        params.forEach((param) => {
          const value = param.value !== null ? param.value : '-';
          result += `${param.marker} ${param.seriesName}: ${formatCurrency(value)}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['收入', '支出'],
      bottom: 0,
      textStyle: {
        color: isDark ? '#ffffff' : '#374151',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.map((d) => d.date),
      axisLine: {
        lineStyle: {
          color: isDark ? '#e5e7eb' : '#888',
        },
      },
      axisLabel: {
        color: isDark ? '#ffffff' : '#6b7280',
        formatter: (value: string) => {
          const type = data[0]?.type || 'month';
          return formatChartLabel(value, type);
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#eee',
        },
      },
      axisLabel: {
        color: isDark ? '#ffffff' : '#6b7280',
      },
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true, // 平滑曲線
        data: chartData.map((d) => d.income),
        itemStyle: {
          color: '#10b981', // emerald-500
        },
        areaStyle: {
          color: {
            type: 'linear',
            // 上到下漸層變化設定
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(16, 185, 129, 0.5)',
              },
              {
                offset: 1,
                color: 'rgba(16, 185, 129, 0)',
              },
            ],
          },
        },
      },
      {
        name: '支出',
        type: 'line',
        smooth: true, // 平滑曲線
        data: chartData.map((d) => d.expense),
        itemStyle: {
          color: '#f43f5e', // rose-500
        },
        areaStyle: {
          color: {
            type: 'linear',
            // 上到下漸層變化設定
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(244, 63, 94, 0.5)',
              },
              {
                offset: 1,
                color: 'rgba(244, 63, 94, 0)',
              },
            ],
          },
        },
      },
    ],
  };

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>收支趨勢</CardTitle>
      </CardHeader>
      <CardContent className="pl-2 relative min-h-[350px]">
        {hasData ? (
          <ReactECharts
            option={option}
            style={{ height: '350px', width: '100%' }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">
              尚無足夠資料顯示趨勢圖
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              開始記帳後即可查看收支趨勢
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TrendChart;
