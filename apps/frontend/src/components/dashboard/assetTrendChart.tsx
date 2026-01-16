'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useDark from '@/hooks/useDark';
import { format } from 'date-fns';

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
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#f8fafc',
        fontFamily: 'Geist Mono',
      },
      padding: [12, 16],
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      formatter: function (params: any[]) {
        const date = params[0].axisValue;
        let result = `<div class="font-bold mb-2 text-slate-300">${date}</div>`;
        params.forEach((param) => {
          const value = param.value.toLocaleString();
          const color = param.color.colorStops
            ? param.color.colorStops[0].color
            : param.color;

          let label = param.seriesName;

          result += `
            <div class="flex items-center justify-between gap-4 text-xs font-mono mb-1">
              <span class="flex items-center gap-2 text-slate-400">
                <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
                ${label}
              </span>
              <span class="font-bold text-white">$${value}</span>
            </div>
          `;
        });
        return result;
      },
    },
    legend: {
      data: ['收入', '支出', '總資產'],
      top: 0,
      left: 'center',
      textStyle: {
        color: isDark ? '#94a3b8' : '#64748b',
      },
      itemWidth: 12,
      itemHeight: 12,
      icon: 'roundRect',
    },
    grid: {
      top: '15%',
      left: '2%',
      right: '2%',
      bottom: '12%',
      containLabel: true,
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        bottom: 0,
        height: 16,
        borderColor: 'transparent',
        backgroundColor: 'rgba(255,255,255,0.05)',
        fillerColor: 'rgba(255,255,255,0.1)',
        handleSize: '100%',
        handleStyle: {
          color: '#64748b',
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
        },
        textStyle: { color: 'transparent' },
        brushSelect: false,
        start: 0,
        end: 100, // Show all by default, user can zoom
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        zoomOnMouseWheel: true,
        moveOnMouseWheel: true,
      },
    ],
    xAxis: [
      {
        type: 'category',
        data: data.map((item) => `${item.year}-${item.month}`),
        axisLabel: {
          formatter: function (value: string) {
            const date = new Date(value);
            return format(date, 'MMM yyyy');
          },
          color: isDark ? '#94a3b8' : '#64748b',
          fontFamily: 'Geist Mono',
          fontSize: 10,
          margin: 14,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '收支',
        nameTextStyle: {
          color: '#64748b',
          align: 'right',
          padding: [0, 8, 0, 0],
        },
        position: 'left',
        axisLabel: {
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
          color: isDark ? '#64748b' : '#94a3b8',
          fontFamily: 'Geist Mono',
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.03)',
          },
        },
      },
      {
        type: 'value',
        name: '總資產',
        nameTextStyle: {
          color: '#64748b',
          align: 'left',
          padding: [0, 0, 0, 8],
        },
        position: 'right',
        axisLabel: {
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
          color: isDark ? '#64748b' : '#94a3b8',
          fontFamily: 'Geist Mono',
          fontSize: 10,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: 12,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10b981' }, // Emerald-500
            { offset: 1, color: 'rgba(16, 185, 129, 0.1)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        data: data.map((item) => item.income),
      },
      {
        name: '支出',
        type: 'bar',
        barMaxWidth: 12,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#f43f5e' }, // Rose-500
            { offset: 1, color: 'rgba(244, 63, 94, 0.1)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        data: data.map((item) => item.expense),
      },
      {
        name: '總資產',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: '#8b5cf6', // Violet-500
          shadowColor: 'rgba(139, 92, 246, 0.5)',
          shadowBlur: 10,
        },
        areaStyle: {
          opacity: 0.1,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#8b5cf6' },
            { offset: 1, color: 'rgba(139, 92, 246, 0)' },
          ]),
        },
        data: data.map((item) => item.balance),
      },
    ],
  };

  return (
    <Card className="h-[450px] border-0 bg-slate-900/50 backdrop-blur-md shadow-lg shadow-black/10 ring-1 ring-white/10 group">
      <CardHeader className="pb-2 border-b border-white/5 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold font-playfair text-white">
            財務概況
          </CardTitle>
          <p className="text-sm text-slate-400">收支與資產趨勢分析</p>
        </div>
      </CardHeader>
      <CardContent className="h-[370px] pt-4">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-white/5 animate-pulse rounded-lg">
            <span className="text-slate-400">載入中...</span>
          </div>
        ) : (
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            notMerge
            lazyUpdate
          />
        )}
      </CardContent>
    </Card>
  );
}
