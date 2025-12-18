'use client';

import { useState } from 'react';
import { DonutChart } from './charts/donutChart';
import { AccountList, AccountListItem } from './lists/accountList';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';

const LEGENDS = Object.values(StatisticsType).map((type) => ({
  key: type,
  label: STATISTICS_CONFIG[type].label,
  color: STATISTICS_CONFIG[type].legendColor,
}));

// --- Mock Data ---
const MOCK_ACCOUNTS_EXPENSE: AccountListItem[] = [
  {
    id: '1',
    name: '玉山數存',
    icon: 'Landmark',
    color: '#ef4444',
    count: 35,
    amount: 25600,
  },
  {
    id: '2',
    name: '國泰薪轉',
    icon: 'Building2',
    color: '#f97316',
    count: 12,
    amount: 18000,
  },
  {
    id: '3',
    name: '現金',
    icon: 'Wallet',
    color: '#eab308',
    count: 42,
    amount: 5400,
  },
  {
    id: '4',
    name: '信用卡',
    icon: 'CreditCard',
    color: '#8b5cf6',
    count: 15,
    amount: 12500,
  },
];

const MOCK_ACCOUNTS_INCOME: AccountListItem[] = [
  {
    id: '11',
    name: '國泰薪轉',
    icon: 'Building2',
    color: '#10b981',
    count: 1,
    amount: 55000,
  },
  {
    id: '12',
    name: '證券戶',
    icon: 'TrendingUp',
    color: '#3b82f6',
    count: 2,
    amount: 3200,
  },
];

export function AccountTab() {
  const [selectedType, setSelectedType] = useState<StatisticsType>(
    StatisticsType.EXPENSE
  );

  const currentItems =
    selectedType === StatisticsType.INCOME
      ? MOCK_ACCOUNTS_INCOME
      : selectedType === StatisticsType.EXPENSE
        ? MOCK_ACCOUNTS_EXPENSE
        : [];

  const totalAmount = currentItems.reduce((sum, item) => sum + item.amount, 0);

  const chartData = currentItems.map((item) => ({
    name: item.name,
    value: item.amount,
    color: item.color,
  }));

  return (
    <AnimateLayout>
      <StatisticsLegend
        options={LEGENDS}
        isSelected={(key) => selectedType === key}
        onToggle={(key) => setSelectedType(key as StatisticsType)}
      />

      <DonutChart data={chartData} totalAmount={totalAmount} />

      <AccountList
        items={currentItems}
        totalAmount={totalAmount}
        type={selectedType}
      />
    </AnimateLayout>
  );
}
