import { describe, it, expect } from 'vitest';
import {
  transactionToCalendarEvent,
  filterForCalendar,
  getEventColor,
} from './calendarUtils';
import { RootType, TransactionType } from '@repo/shared';

const createMockTransaction = (
  overrides: Partial<TransactionType> = {},
): TransactionType =>
  ({
    id: 'tx-1',
    userId: 'user-1',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    date: '2026-02-05',
    time: '14:30:00',
    type: RootType.EXPENSE,
    amount: 150,
    description: '午餐',
    linkId: null,
    targetAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as TransactionType;

describe('transactionToCalendarEvent', () => {
  it('should convert transaction to calendar event', () => {
    const tx = createMockTransaction({
      id: 'tx-1',
      date: '2026-02-05',
      time: '14:30:00',
      type: RootType.EXPENSE,
      amount: 150,
      description: '午餐',
    });

    const event = transactionToCalendarEvent(tx);

    expect(event.id).toBe('tx-1');
    expect(event.title).toBe('午餐');
    // 使用當天午夜（本地時間）
    // 注意：toISOString() 會轉為 UTC，所以用 getDate/getMonth 檢查本地時間
    expect(event.start.getDate()).toBe(5);
    expect(event.start.getMonth()).toBe(1); // February = 1
    expect(event.start.getFullYear()).toBe(2026);
    expect(event.type).toBe(RootType.EXPENSE);
    expect(event.isTransfer).toBe(false);
  });

  it('should mark transfer transactions (has targetAccountId)', () => {
    const tx = createMockTransaction({
      id: 'tx-2',
      targetAccountId: 'acc-2',
      linkId: 'tx-3',
    });

    const event = transactionToCalendarEvent(tx);
    expect(event.isTransfer).toBe(true);
  });

  it('should use description as title', () => {
    const tx = createMockTransaction({
      description: '測試描述',
    });

    const event = transactionToCalendarEvent(tx);
    expect(event.title).toBe('測試描述');
  });

  it('should fallback to "Transaction" when description is empty', () => {
    const tx = createMockTransaction({
      description: '',
    });

    const event = transactionToCalendarEvent(tx);
    expect(event.title).toBe('Transaction');
  });
});

describe('filterForCalendar', () => {
  it('should exclude incoming transfers', () => {
    const transactions = [
      createMockTransaction({
        id: '1',
        targetAccountId: null,
        type: RootType.EXPENSE,
      }),
      createMockTransaction({
        id: '2',
        targetAccountId: 'acc-1',
        type: RootType.EXPENSE,
      }), // 扣款方，顯示
      createMockTransaction({
        id: '3',
        targetAccountId: 'acc-2',
        type: RootType.INCOME,
      }), // 收款方，不顯示
    ];

    const filtered = filterForCalendar(transactions);

    expect(filtered.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('should keep normal income transactions', () => {
    const transactions = [
      createMockTransaction({
        id: '1',
        targetAccountId: null,
        type: RootType.INCOME,
      }),
    ];

    const filtered = filterForCalendar(transactions);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });
});

describe('getEventColor', () => {
  it('should return teal for income', () => {
    expect(getEventColor(RootType.INCOME)).toBe('bg-teal-100');
  });

  it('should return rose for expense', () => {
    expect(getEventColor(RootType.EXPENSE)).toBe('bg-rose-100');
  });

  it('should return cyan for transfer (isTransfer = true)', () => {
    expect(getEventColor(RootType.EXPENSE, true)).toBe('bg-cyan-100');
  });

  it('should return slate for unknown type', () => {
    expect(getEventColor('UNKNOWN' as RootType)).toBe('bg-slate-100');
  });
});
