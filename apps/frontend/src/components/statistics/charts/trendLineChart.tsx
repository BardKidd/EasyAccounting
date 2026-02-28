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
    <Card className="border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
      <CardHeader className="pb-2 border-b border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/0 via-emerald-500/5 to-teal-500/0 dark:from-emerald-400/0 dark:via-emerald-400/5 dark:to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardTitle className="text-xl font-bold font-playfair text-slate-900 dark:text-white relative z-10 transition-colors duration-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
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
