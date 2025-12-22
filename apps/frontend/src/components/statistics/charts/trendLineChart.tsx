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
        backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? '#333' : '#ccc',
        textStyle: {
          color: isDark ? '#fff' : '#333',
        },
        formatter: (params: any[]) => {
          let result = `<div>${params[0].axisValue}</div>`;
          params.forEach((param) => {
            result += `<div style="display:flex; justify-content:space-between; gap:10px;">
              <span>${param.marker} ${param.seriesName}</span>
              <span style="font-weight:bold;">${formatCurrency(param.value)}</span>
            </div>`;
          });
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
    <Card>
      <CardHeader>
        <CardTitle>收支趨勢</CardTitle>
      </CardHeader>
      <CardContent>
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
