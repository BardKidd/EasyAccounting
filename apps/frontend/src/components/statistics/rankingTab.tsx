'use client';

import { useState } from 'react';
import { RankingList, RankingTransaction } from './lists/rankingList';
import { MainType } from '@repo/shared';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';

// 不用顯示餘額，所以跟其他 Tab 不太一樣
const LEGENDS = [
  StatisticsType.EXPENSE,
  StatisticsType.INCOME,
  StatisticsType.TRANSFER_IN,
  StatisticsType.TRANSFER_OUT,
].map((type) => ({
  key: type,
  label: STATISTICS_CONFIG[type].label,
  color: STATISTICS_CONFIG[type].legendColor,
}));

// --- Mock Data ---
const MOCK_RANKING_EXPENSE: RankingTransaction[] = [
  {
    id: '1',
    type: MainType.EXPENSE,
    categoryId: 'cat1',
    categoryName: '購物',
    categoryIcon: 'ShoppingBag',
    categoryColor: '#3b82f6',
    description: 'iPhone 15 Pro Max',
    accountName: '玉山數存',
    amount: 44900,
    targetAccountId: null,
  },
  {
    id: '2',
    type: MainType.EXPENSE,
    categoryId: 'cat5',
    categoryName: '居住',
    categoryIcon: 'Home',
    categoryColor: '#f59e0b',
    description: '12月房租',
    accountName: '國泰薪轉',
    amount: 15000,
    targetAccountId: null,
  },
  {
    id: '3',
    type: MainType.EXPENSE,
    categoryId: 'cat2',
    categoryName: '飲食',
    categoryIcon: 'Utensils',
    categoryColor: '#f43f5e',
    description: '王品牛排聚餐',
    accountName: '現金',
    amount: 3500,
    targetAccountId: null,
  },
  {
    id: '4',
    type: MainType.EXPENSE,
    categoryId: 'cat6',
    categoryName: '醫療',
    categoryIcon: 'Stethoscope',
    categoryColor: '#ef4444',
    description: '牙醫診所',
    accountName: '信用卡',
    amount: 3000,
    targetAccountId: null,
  },
  {
    id: '5',
    type: MainType.EXPENSE,
    categoryId: 'cat1',
    categoryName: '購物',
    categoryIcon: 'ShoppingBag',
    categoryColor: '#3b82f6',
    description: 'Uniqlo 冬衣',
    accountName: '信用卡',
    amount: 2800,
    targetAccountId: null,
  },
];

const MOCK_RANKING_INCOME: RankingTransaction[] = [
  {
    id: '10',
    type: MainType.INCOME,
    categoryId: 'cat10',
    categoryName: '薪資',
    categoryIcon: 'Banknote',
    categoryColor: '#10b981',
    description: '12月薪資',
    accountName: '國泰薪轉',
    amount: 60000,
    targetAccountId: null,
  },
  {
    id: '11',
    type: MainType.INCOME,
    categoryId: 'cat11',
    categoryName: '獎金',
    categoryIcon: 'Trophy',
    categoryColor: '#f59e0b',
    description: '年終獎金',
    accountName: '國泰薪轉',
    amount: 5000,
    targetAccountId: null,
  },
  {
    id: '12',
    type: MainType.INCOME,
    categoryId: 'cat12',
    categoryName: '投資',
    categoryIcon: 'TrendingUp',
    categoryColor: '#3b82f6',
    description: '股票股利',
    accountName: '證券戶',
    amount: 2000,
    targetAccountId: null,
  },
];

export function RankingTab() {
  const [selectedType, setSelectedType] = useState<StatisticsType>(
    StatisticsType.EXPENSE
  );

  const transactions =
    selectedType === StatisticsType.EXPENSE
      ? MOCK_RANKING_EXPENSE
      : selectedType === StatisticsType.INCOME
        ? MOCK_RANKING_INCOME
        : [];

  const sortedTransactions = [...transactions].sort(
    (a, b) => b.amount - a.amount
  );

  return (
    <AnimateLayout>
      <StatisticsLegend
        options={LEGENDS}
        isSelected={(key) => selectedType === key}
        onToggle={(key) => setSelectedType(key as StatisticsType)}
      />

      <RankingList transactions={sortedTransactions} />
    </AnimateLayout>
  );
}
