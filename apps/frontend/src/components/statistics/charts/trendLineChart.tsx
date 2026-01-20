'use client';

import ReactECharts from 'echarts-for-react';
import { graphic } from 'echarts';
import useDark from '@/hooks/useDark';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { StatisticsType, STATISTICS_CONFIG } from '../constants';

interface TrendLineChartProps {
  dates: string[];
  seriesData: Record<string, number[]>;
  selectedSeries: Record<string, boolean>;
}

export function TrendLineChart({
  dates,
  seriesData,
  selectedSeries,
}: TrendLineChartProps) {
  const isDark = useDark();

  const getOption = () => {
    const activeSeries = Object.keys(seriesData)
      .filter((key) => selectedSeries[key])
      .map((key) => {
        const type = key as StatisticsType;
        const config = STATISTICS_CONFIG[type];
        return {
          name: config?.label || key,
          type: 'line',
          data: seriesData[key],
          smooth: true,
          showSymbol: false,
          symbolSize: 8, // 顯示點的大小
          lineStyle: {
            width: 3,
            color: config?.color || '#999',
          },
          itemStyle: {
            color: config?.color || '#999',
          },
          emphasis: {
            focus: 'series', // 使點擊某條線時，只高亮該條線
          },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: config?.color || '#999', // 0% 處的顏色
              },
              {
                offset: 1,
                color: 'rgba(255, 255, 255, 0)', // 100% 處的顏色
              },
            ]),
            opacity: 0.4,
          },
        };
      });

    return {
      backgroundColor: 'transparent',
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
        extraCssText:
          'backdrop-filter: blur(8px); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
        formatter: (params: any[]) => {
          let result = `<div class="font-bold mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">${params[0].axisValue}</div>`;
          result += '<div class="space-y-1">';
          params.forEach((param) => {
            result += `<div style="display:flex; justify-content:space-between; gap:20px; align-items:center;">
              <span style="display:flex; align-items:center; gap:6px;">${param.marker} <span class="text-xs opacity-80">${param.seriesName}</span></span>
              <span class="font-mono font-bold">${formatCurrency(param.value)}</span>
            </div>`;
          });
          result += '</div>';
          return result;
        },
      },
      legend: {
        show: false,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: {
          lineStyle: {
            color: isDark ? '#e5e7eb' : '#888',
          },
        },
        axisLabel: {
          color: isDark ? '#ffffff' : '#6b7280',
          interval: 'auto', // 自動判斷 X 軸標籤的間隔
        },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: isDark ? '#ffffff' : '#6b7280',
        },
      },
      series: activeSeries,
    };
  };

  return (
    <Card className="border-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/10 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-white dark:hover:bg-slate-900/70 transition-all duration-300 group">
      <CardHeader className="border-b border-slate-200 dark:border-white/5 pb-4">
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white">
          收支趨勢
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ReactECharts
          option={getOption()}
          style={{ height: '350px', width: '100%' }}
          theme={isDark ? 'dark' : undefined}
          notMerge
        />
      </CardContent>
    </Card>
  );
}
