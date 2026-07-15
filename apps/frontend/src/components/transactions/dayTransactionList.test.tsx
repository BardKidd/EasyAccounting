import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DayTransactionList } from './dayTransactionList';
import {
  AccountType,
  CategoryType,
  RootType,
  TransactionType,
} from '@repo/shared';

const categories: CategoryType[] = [
  {
    id: 'root-expense',
    name: '支出',
    type: RootType.EXPENSE,
    children: [
      { id: 'c-food', name: '餐飲', icon: 'utensils', children: [] },
      { id: 'c-transport', name: '交通', icon: 'bus', children: [] },
    ],
  } as unknown as CategoryType,
  {
    id: 'c-salary',
    name: '薪資',
    icon: 'banknote',
    children: [],
  } as unknown as CategoryType,
];

const accounts: AccountType[] = [
  { id: 'acc-1', name: '現金', icon: 'wallet' } as unknown as AccountType,
  { id: 'acc-2', name: '證券戶', icon: 'landmark' } as unknown as AccountType,
];

const createTx = (overrides: Partial<TransactionType> = {}): TransactionType =>
  ({
    id: 'tx-1',
    userId: 'user-1',
    accountId: 'acc-1',
    categoryId: 'c-food',
    date: '2026-07-15',
    time: '12:00:00',
    type: RootType.EXPENSE,
    amount: 100,
    description: '',
    linkId: null,
    targetAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as TransactionType;

const renderList = (
  transactions: TransactionType[],
  onEdit = vi.fn(),
  onCreate = vi.fn(),
) => {
  render(
    <DayTransactionList
      date={new Date('2026-07-15T00:00:00')}
      transactions={transactions}
      categories={categories}
      accounts={accounts}
      onEdit={onEdit}
      onCreate={onCreate}
    />,
  );
  return { onEdit, onCreate };
};

describe('DayTransactionList', () => {
  it('依時間排序顯示交易列', () => {
    renderList([
      createTx({ id: 'late', time: '19:20:00', categoryId: 'c-transport' }),
      createTx({ id: 'early', time: '08:12:00', categoryId: 'c-food' }),
    ]);

    const rows = screen.getAllByTestId('day-list-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('08:12');
    expect(rows[1].textContent).toContain('19:20');
  });

  it('顯示分類名稱與帳戶名稱', () => {
    renderList([createTx({ categoryId: 'c-food', accountId: 'acc-1' })]);

    const row = screen.getByTestId('day-list-row');
    expect(row.textContent).toContain('餐飲');
    expect(row.textContent).toContain('現金');
  });

  it('支出帶負號、收入帶正號、轉帳不帶符號', () => {
    renderList([
      createTx({ id: 'e', time: '08:00:00', amount: 120 }),
      createTx({
        id: 'i',
        time: '09:00:00',
        type: RootType.INCOME,
        categoryId: 'c-salary',
        amount: 500,
      }),
      createTx({
        id: 't',
        time: '10:00:00',
        targetAccountId: 'acc-2',
        linkId: 'x',
        amount: 50000,
      }),
    ]);

    const rows = screen.getAllByTestId('day-list-row');
    expect(rows[0].textContent).toMatch(/-[^\d]*120/);
    expect(rows[1].textContent).toMatch(/\+[^\d]*500/);
    expect(rows[2].textContent).not.toMatch(/[+-][^\d]*50,?000/);
  });

  it('當日小計排除轉帳', () => {
    renderList([
      createTx({ id: 'e', amount: 100 }),
      createTx({
        id: 't',
        time: '10:00:00',
        targetAccountId: 'acc-2',
        linkId: 'x',
        amount: 50000,
      }),
      createTx({
        id: 'i',
        time: '11:00:00',
        type: RootType.INCOME,
        categoryId: 'c-salary',
        amount: 500,
      }),
    ]);

    const summary = screen.getByTestId('day-list-summary');
    expect(summary.textContent).toContain('400'); // 結餘 500 - 100
    expect(summary.textContent).not.toContain('50,000');
  });

  it('無交易時顯示空狀態與新增入口', () => {
    const { onCreate } = renderList([]);

    expect(screen.getByTestId('day-list-empty').textContent).toContain(
      '這天沒有紀錄',
    );
    fireEvent.click(screen.getByRole('button', { name: /新增交易/ }));
    expect(onCreate).toHaveBeenCalled();
  });

  it('點擊交易列呼叫 onEdit 帶入 id', () => {
    const { onEdit } = renderList([createTx({ id: 'tx-9' })]);

    fireEvent.click(screen.getByTestId('day-list-row'));
    expect(onEdit).toHaveBeenCalledWith('tx-9');
  });
});
