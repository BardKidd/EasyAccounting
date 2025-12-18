'use client';

import { SummaryBarChart } from './charts/summaryBarChart';
import { TopCategoriesPie } from './charts/topCategoriesPie';
import { TopExpensesList } from './charts/topExpensesList';
import AnimateLayout from './common/animateLayout';

// MOCK DATA
const MOCK_SUMMARY = {
  income: 85000,
  expense: 42300,
  transferIn: 15000,
  transferOut: 5000,
  balance: 52700,
};

const MOCK_CATEGORIES = [
  { name: '飲食', amount: 15600, color: '#f43f5e' }, // rose-500
  { name: '購物', amount: 12400, color: '#3b82f6' }, // blue-500
  { name: '交通', amount: 5800, color: '#10b981' }, // emerald-500
];

const MOCK_EXPENSES = [
  {
    id: '1',
    category: '購物',
    note: 'iPhone 15 Case',
    date: '2025-12-15',
    amount: 1290,
  },
  {
    id: '2',
    category: '飲食',
    note: '王品牛排聚餐',
    date: '2025-12-14',
    amount: 3500,
  },
  {
    id: '3',
    category: '娛樂',
    note: 'Netflix 年度訂閱',
    date: '2025-12-10',
    amount: 2700,
  },
];

export function OverviewTab() {
  return (
    <AnimateLayout>
      <section>
        <SummaryBarChart data={MOCK_SUMMARY} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopCategoriesPie
            totalExpense={MOCK_SUMMARY.expense}
            categories={MOCK_CATEGORIES}
          />
        </div>
        <div className="lg:col-span-1">
          <TopExpensesList items={MOCK_EXPENSES} />
        </div>
      </section>
    </AnimateLayout>
  );
}
