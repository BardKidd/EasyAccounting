'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TrendChart() {
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
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
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
        data: [12000, 13200, 10100, 13400, 9000, 23000, 21000],
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
        data: [8000, 8200, 9100, 8400, 10000, 11000, 9500],
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
        <ReactECharts
          option={option}
          style={{ height: '350px', width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}
