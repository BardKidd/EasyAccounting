'use client';

import { useState } from 'react';
import { MainType } from '@repo/shared';
import { TrendLineChart } from './charts/trendLineChart';
import {
  DailyTransactionList,
  DetailsTransaction,
} from './lists/dailyTransactionList';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';

const LEGENDS = Object.values(StatisticsType).map((type) => ({
  key: type,
  label: STATISTICS_CONFIG[type].label,
  color: STATISTICS_CONFIG[type].legendColor,
}));

const DATES = Array.from(
  { length: 15 },
  (_, i) => `2025-12-${String(i + 1).padStart(2, '0')}`
);

const generateRandomSeries = (min: number, max: number) => {
  return DATES.map(() => Math.floor(Math.random() * (max - min) + min));
};

const MOCK_SERIES = {
  [StatisticsType.INCOME]: generateRandomSeries(0, 5000),
  [StatisticsType.EXPENSE]: generateRandomSeries(500, 3000),
  [StatisticsType.TRANSFER_IN]: generateRandomSeries(0, 2000),
  [StatisticsType.TRANSFER_OUT]: generateRandomSeries(0, 2000),
  [StatisticsType.BALANCE]: generateRandomSeries(10000, 50000),
};

const MOCK_TRANSACTIONS: DetailsTransaction[] = [
  {
    id: '1',
    date: '2025-12-15',
    amount: 1290,
    type: MainType.EXPENSE,
    categoryId: 'cat1',
    categoryName: '購物',
    categoryIcon: 'ShoppingBag',
    categoryColor: '#3b82f6',
    description: 'iPhone 15 Case',
    accountName: '玉山數存',
  },
  {
    id: '2',
    date: '2025-12-14',
    amount: 3500,
    type: MainType.EXPENSE,
    categoryId: 'cat2',
    categoryName: '飲食',
    categoryIcon: 'Utensils',
    categoryColor: '#f43f5e',
    description: '王品牛排聚餐',
    accountName: '現金',
  },
  {
    id: '3',
    date: '2025-12-12',
    amount: 50000,
    type: MainType.INCOME,
    categoryId: 'cat3',
    categoryName: '薪資',
    categoryIcon: 'Banknote',
    categoryColor: '#10b981',
    description: '12月薪資',
    accountName: '國泰薪轉',
  },
  {
    id: '4',
    date: '2025-12-10',
    amount: 5000,
    type: MainType.EXPENSE, // Transfer is distinguished by targetAccountName
    categoryId: 'cat4',
    categoryName: '轉帳',
    categoryIcon: 'ArrowRightLeft',
    categoryColor: '#f59e0b',
    description: '生活費轉帳',
    accountName: '國泰薪轉',
    targetAccountName: '玉山數存',
  },
  {
    id: '5',
    date: '2025-12-08',
    amount: 300,
    type: MainType.EXPENSE,
    categoryId: 'cat5',
    categoryName: '交通',
    categoryIcon: 'Car',
    categoryColor: '#8b5cf6',
    description: 'Uber',
    accountName: '信用卡',
  },
];

export function DetailsTab() {
  const [selectedLegends, setSelectedLegends] = useState<
    Record<string, boolean>
  >({
    [StatisticsType.INCOME]: false,
    [StatisticsType.EXPENSE]: true,
    [StatisticsType.TRANSFER_IN]: false,
    [StatisticsType.TRANSFER_OUT]: false,
    [StatisticsType.BALANCE]: false,
  });

  const toggleLegend = (key: string) => {
    setSelectedLegends((prev) => {
      return {
        ...prev,
        [key]: !prev[key],
      };
    });
  };

  return (
    <AnimateLayout>
      <StatisticsLegend
        options={LEGENDS}
        isSelected={(key) => !!selectedLegends[key]}
        onToggle={toggleLegend}
      />

      <TrendLineChart
        dates={DATES}
        seriesData={MOCK_SERIES}
        selectedSeries={selectedLegends}
      />

      <DailyTransactionList transactions={MOCK_TRANSACTIONS} />
    </AnimateLayout>
  );
}
