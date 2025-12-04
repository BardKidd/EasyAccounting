'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TrendChart() {
  // 空資料狀態
  const hasData = false;

  const option = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['收入', '支出'],
      bottom: 0,
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
      data: [],
      axisLine: {
        lineStyle: {
          color: '#888',
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
          color: '#eee',
        },
      },
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        data: [],
        itemStyle: {
          color: '#10b981', // emerald-500
        },
        areaStyle: {
          color: {
            type: 'linear',
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
        smooth: true,
        data: [],
        itemStyle: {
          color: '#f43f5e', // rose-500
        },
        areaStyle: {
          color: {
            type: 'linear',
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
      <CardContent className="pl-2">
        {!hasData ? (
          <div
            className="flex items-center justify-center"
            style={{ height: '350px' }}
          >
            <div className="text-center">
              <p className="text-muted-foreground">尚無足夠資料顯示趨勢圖</p>
              <p className="text-sm text-muted-foreground mt-2">
                開始記帳後即可查看收支趨勢
              </p>
            </div>
          </div>
        ) : (
          <ReactECharts
            option={option}
            style={{ height: '350px', width: '100%' }}
          />
        )}
      </CardContent>
    </Card>
  );
}
