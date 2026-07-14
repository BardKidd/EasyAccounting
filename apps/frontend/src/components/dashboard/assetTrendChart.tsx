'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useState, useEffect } from 'react';
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
  hasMultiCurrency?: boolean;
}

export default function AssetTrendChart({
  data,
  isLoading,
  hasMultiCurrency,
}: AssetTrendChartProps) {
  const isDark = useDark();

  // 手機（<md）：關掉會攔截單指捲動的 inside dataZoom（scroll-trap P1）、精簡雙軸標籤。
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const option = {
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
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      formatter: function (params: any[]) {
        const date = params[0].axisValue;
        let result = `<div class="font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}">${date}</div>`;
        params.forEach((param) => {
          const value = param.value.toLocaleString();
          const color = param.color.colorStops
            ? param.color.colorStops[0].color
            : param.color;

          let label = param.seriesName;
          let valueStyling = isDark ? 'text-white' : 'text-slate-900';

          result += `
            <div class="flex items-center justify-between gap-4 text-xs font-mono mb-1">
              <span class="flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}">
                <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
                  ${label}
              </span>
              <span class="font-bold tracking-tight ${valueStyling}">$${value}</span>
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
    // 手機不放 dataZoom：inside 版會把單指拖曳吃成平移，導致頁面捲不過圖表（scroll-trap）。
    dataZoom: isMobile
      ? []
      : [
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
          fontSize: isMobile ? 11 : 10,
          margin: 14,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: isMobile ? '' : '收支',
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
          fontSize: isMobile ? 11 : 10,
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)',
          },
        },
      },
      {
        type: 'value',
        name: isMobile ? '' : '總資產',
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
          fontSize: isMobile ? 11 : 10,
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
            { offset: 0, color: '#10b981' }, // emerald-500
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
            { offset: 0, color: '#e11d48' }, // Rose-600
            { offset: 1, color: 'rgba(225, 29, 72, 0.1)' },
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
          color: '#14b8a6', // teal-500
          shadowColor: 'rgba(20, 184, 166, 0.5)',
          shadowBlur: 10,
        },
        areaStyle: {
          opacity: 0.1,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#0d9488' },
            { offset: 1, color: 'rgba(13, 148, 136, 0)' },
          ]),
        },
        data: data.map((item) => item.balance),
      },
    ],
  };

  return (
    <Card className="h-auto min-h-[380px] md:h-[450px] border border-slate-200 dark:border-slate-800 bg-card shadow-sm group relative overflow-hidden">
      <CardHeader className="pb-2 border-b border-slate-200 dark:border-white/5 flex flex-row items-center justify-between relative z-10">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold font-outfit tracking-wide text-slate-800 dark:text-slate-100">
            財務概況
          </CardTitle>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            收支與資產趨勢分析
          </p>
        </div>
        {hasMultiCurrency && (
          <span
            title="此圖含外幣帳戶：目前總資產以今日匯率計算，歷史月份以交易當下匯率估算，兩者口徑不同，故歷史資產曲線為近似值。"
            className="shrink-0 cursor-help rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
          >
            ≈ 近似
          </span>
        )}
      </CardHeader>
      <CardContent className="h-[320px] md:h-[370px] pt-4 relative z-10">
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
