import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Account,
  AccountType,
  CategoryType,
  PaymentFrequency,
  RootType,
  TransactionType,
} from '@repo/shared';
import { TransactionSheet } from './transactionSheet';

const stubResizeObserver = () =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

const stubMobileViewport = () =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );

const makeCategory = (
  id: string,
  name: string,
  children: CategoryType[] = [],
): CategoryType => ({
  id,
  name,
  type: RootType.EXPENSE,
  icon: null,
  color: null,
  children,
  parent: null,
  parentId: null,
  userId: 'u1',
});

const categories: CategoryType[] = [
  {
    ...makeCategory('root-expense', '支出', [
      makeCategory('food', '餐飲', [makeCategory('lunch', '午餐')]),
    ]),
    userId: null,
  },
];

const accounts: AccountType[] = [
  {
    id: 'cash',
    userId: 'u1',
    name: '現金',
    type: Account.CASH,
    balance: 3240,
    currencyCode: 'TWD',
    icon: 'Wallet',
    color: '#10b981',
    isArchived: false,
    onBudget: true,
  },
];

const transaction = {
  id: 't1',
  accountId: 'cash',
  amount: 180,
  type: RootType.EXPENSE,
  description: '牛肉麵',
  date: '2026-07-14',
  time: '12:30:00',
  categoryId: 'lunch',
  receipt: '',
  targetAccountId: null,
  paymentFrequency: PaymentFrequency.ONE_TIME,
  tags: [],
  splits: [],
  isSplit: false,
  recurringTemplateId: null,
} as unknown as TransactionType;

describe('TransactionSheet 手機版面', () => {
  beforeEach(() => {
    stubResizeObserver();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('create mode：金額置頂、分類圖示列、帳戶列、固定儲存鍵、類型切換', async () => {
    stubMobileViewport();
    render(
      <TransactionSheet
        isOpen
        onClose={() => {}}
        categories={categories}
        accounts={accounts}
      />,
    );

    expect(await screen.findByLabelText('金額')).toBeTruthy();
    expect(screen.getByRole('button', { name: /餐飲/ })).toBeTruthy();
    expect(screen.getByText('帳戶')).toBeTruthy();
    expect(screen.getByRole('button', { name: '儲存' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '收入' })).toBeTruthy();
    expect(screen.getByText(/額外金額/)).toBeTruthy();
    expect(screen.getByText('更多選項')).toBeTruthy();
  });

  it('edit mode：類型變唯讀 badge、刪除收進「更多動作」、儲存變更鍵', async () => {
    stubMobileViewport();
    render(
      <TransactionSheet
        isOpen
        onClose={() => {}}
        categories={categories}
        accounts={accounts}
        transaction={transaction}
      />,
    );

    expect(await screen.findByText('編輯交易')).toBeTruthy();
    expect(screen.getByLabelText('更多動作')).toBeTruthy();
    // 類型不可改：沒有收入／轉帳切換鍵
    expect(screen.queryByRole('button', { name: '收入' })).toBeNull();
    expect(screen.getByRole('button', { name: '儲存變更' })).toBeTruthy();
  });

  it('桌面（無 matchMedia）維持原版面', async () => {
    render(
      <TransactionSheet
        isOpen
        onClose={() => {}}
        categories={categories}
        accounts={accounts}
      />,
    );

    // 桌面版帳戶下拉 placeholder
    expect(await screen.findByText('選擇帳戶')).toBeTruthy();
    expect(screen.queryByText('更多選項')).toBeNull();
  });
});
