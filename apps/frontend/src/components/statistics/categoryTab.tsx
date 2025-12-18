'use client';

import { useState } from 'react';
import { DonutChart } from './charts/donutChart';
import { CategoryList, CategoryListItem } from './lists/categoryList';
import { StatisticsLegend } from './common/statisticsLegend';
import { StatisticsType, STATISTICS_CONFIG } from './constants';
import AnimateLayout from './common/animateLayout';

const LEGENDS = Object.values(StatisticsType).map((type) => ({
  key: type,
  label: STATISTICS_CONFIG[type].label,
  color: STATISTICS_CONFIG[type].legendColor,
}));

// --- Mock Data Generators ---
const MOCK_CATEGORIES_EXPENSE: CategoryListItem[] = [
  {
    id: '1',
    name: '飲食',
    icon: 'Utensils',
    color: '#f43f5e',
    count: 12,
    amount: 8500,
  },
  {
    id: '2',
    name: '購物',
    icon: 'ShoppingBag',
    color: '#3b82f6',
    count: 5,
    amount: 6200,
  },
  {
    id: '3',
    name: '交通',
    icon: 'Car',
    color: '#10b981',
    count: 8,
    amount: 1500,
  },
  {
    id: '4',
    name: '娛樂',
    icon: 'Tv',
    color: '#8b5cf6',
    count: 3,
    amount: 1200,
  },
  {
    id: '5',
    name: '居住',
    icon: 'Home',
    color: '#f59e0b',
    count: 1,
    amount: 15000,
  },
  {
    id: '6',
    name: '醫療',
    icon: 'Stethoscope',
    color: '#ef4444',
    count: 2,
    amount: 3000,
  },
  {
    id: '7',
    name: '教育',
    icon: 'GraduationCap',
    color: '#06b6d4',
    count: 1,
    amount: 2000,
  },
];

const MOCK_CATEGORIES_INCOME: CategoryListItem[] = [
  {
    id: '10',
    name: '薪資',
    icon: 'Banknote',
    color: '#10b981',
    count: 1,
    amount: 60000,
  },
  {
    id: '11',
    name: '獎金',
    icon: 'Trophy',
    color: '#f59e0b',
    count: 1,
    amount: 5000,
  },
  {
    id: '12',
    name: '投資',
    icon: 'TrendingUp',
    color: '#3b82f6',
    count: 2,
    amount: 3000,
  },
];

export function CategoryTab() {
  const [selectedType, setSelectedType] = useState<StatisticsType>(
    StatisticsType.EXPENSE
  );

  const currentItems =
    selectedType === StatisticsType.INCOME
      ? MOCK_CATEGORIES_INCOME
      : selectedType === StatisticsType.EXPENSE
        ? MOCK_CATEGORIES_EXPENSE
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

      <CategoryList
        items={currentItems}
        totalAmount={totalAmount}
        type={selectedType}
      />
    </AnimateLayout>
  );
}
