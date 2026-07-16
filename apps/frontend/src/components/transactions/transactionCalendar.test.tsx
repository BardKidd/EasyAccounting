import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { format, subDays, addDays } from 'date-fns';
import TransactionCalendar from './transactionCalendar';
import {
  AccountType,
  CategoryType,
  RootType,
  TransactionType,
} from '@repo/shared';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('@/services/transaction', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/transaction')>();
  return {
    ...actual,
    getTransactions: vi.fn().mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 1000, totalPages: 1 },
    }),
    updateTransaction: vi.fn(),
  };
});

const stubMatchMedia = (isMobile: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width') ? isMobile : true, // pointer: coarse → true
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
};

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
// 同月且無交易的一天（今天是 1 號就取隔天，否則取前一天）
const otherDay = today.getDate() === 1 ? addDays(today, 1) : subDays(today, 1);
const otherDayStr = format(otherDay, 'yyyy-MM-dd');

const categories: CategoryType[] = [
  {
    id: 'root-expense',
    name: '支出',
    type: RootType.EXPENSE,
    children: [{ id: 'c-food', name: '餐飲', icon: 'utensils', children: [] }],
  } as unknown as CategoryType,
];

const accounts: AccountType[] = [
  { id: 'acc-1', name: '現金', icon: 'wallet' } as unknown as AccountType,
];

const transactions: TransactionType[] = [
  {
    id: 'tx-1',
    userId: 'u1',
    accountId: 'acc-1',
    categoryId: 'c-food',
    date: todayStr,
    time: '08:12:00',
    type: RootType.EXPENSE,
    amount: 75,
    description: '早餐',
    linkId: null,
    targetAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as TransactionType,
];

const renderCalendar = () =>
  render(
    <TransactionCalendar
      transactions={transactions}
      categories={categories}
      accounts={accounts}
    />,
  );

describe('TransactionCalendar 手機/桌機分流', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it('手機版渲染 MobileMonthCalendar 與當日 List，不渲染 react-big-calendar', () => {
    stubMatchMedia(true);
    renderCalendar();

    expect(screen.getByTestId(`mobile-day-${todayStr}`)).toBeTruthy();
    expect(document.querySelector('.rbc-calendar')).toBeNull();

    const row = screen.getByTestId('day-list-row');
    expect(row.textContent).toContain('餐飲');
    expect(row.textContent).toContain('08:12');
  });

  it('手機版預設選取今天', () => {
    stubMatchMedia(true);
    renderCalendar();

    expect(
      screen.getByTestId(`mobile-day-${todayStr}`).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('點其他日期切換下方 List（無交易日顯示空狀態）', () => {
    stubMatchMedia(true);
    renderCalendar();

    fireEvent.click(screen.getByTestId(`mobile-day-${otherDayStr}`));

    expect(screen.queryByTestId('day-list-row')).toBeNull();
    expect(screen.getByTestId('day-list-empty')).toBeTruthy();
  });

  it('桌機版仍渲染 react-big-calendar', () => {
    stubMatchMedia(false);
    renderCalendar();

    expect(document.querySelector('.rbc-calendar')).toBeTruthy();
    expect(screen.queryByTestId(`mobile-day-${todayStr}`)).toBeNull();
  });
});
