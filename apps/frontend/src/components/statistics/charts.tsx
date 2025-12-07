'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionType, MainType, CategoryType } from '@repo/shared';

interface ChartsProps {
  transactions: TransactionType[];
  categories: CategoryType[];
}

export function ExpensePieChart({ transactions, categories }: ChartsProps) {
  // Filter expenses
  const expenses = transactions.filter((t) => t.type === MainType.EXPENSE);

  // Group by category
  const data = expenses.reduce(
    (acc, curr) => {
      // Find category Name
      // Note: Assuming categoryId matches typical flat or nested ID.
      // For simplicity, we use ID if name lookup is complex without flattened list.
      // But we passed categories.
      const catName =
        categories.find((c) => c.id === curr.categoryId)?.name ||
        categories
          .flatMap((c) => c.children || [])
          .find((s) => s.id === curr.categoryId)?.name ||
        '未分類';

      if (!acc[catName]) acc[catName] = 0;
      acc[catName] += curr.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', left: 'center' },
    series: [
      {
        name: '支出分類',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: { show: false },
        data: chartData,
      },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>支出分佈</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: '300px' }} />
      </CardContent>
    </Card>
  );
}

export function TrendChart({
  transactions,
}: {
  transactions: TransactionType[];
}) {
  // Group by month
  // Assuming transactions are within a range.
  const data = transactions.reduce(
    (acc, curr) => {
      const month = curr.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = { income: 0, expense: 0 };
      if (curr.type === MainType.INCOME) acc[month].income += curr.amount;
      if (curr.type === MainType.EXPENSE) acc[month].expense += curr.amount;
      return acc;
    },
    {} as Record<string, { income: number; expense: number }>
  );

  const months = Object.keys(data).sort();
  const incomeData = months.map((m) => data[m].income);
  const expenseData = months.map((m) => data[m].expense);

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: months },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#10b981' }, // emerald-500
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#ecfdf5' },
            ],
          },
        },
        data: incomeData,
      },
      {
        name: '支出',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#ef4444' }, // red-500
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#ef4444' },
              { offset: 1, color: '#fef2f2' },
            ],
          },
        },
        data: expenseData,
      },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>收支趨勢</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: '300px' }} />
      </CardContent>
    </Card>
  );
}
