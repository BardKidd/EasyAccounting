import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionSheet } from './transactionSheet';
import { AccountType, CategoryType } from '@repo/shared';

// jsdom 無 ResizeObserver（Radix use-size 需要）
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const categories: CategoryType[] = [];
const accounts: AccountType[] = [];

describe('TransactionSheet defaultDate', () => {
  it('create mode 使用 defaultDate 作為日期初始值', async () => {
    render(
      <TransactionSheet
        isOpen
        onClose={() => {}}
        categories={categories}
        accounts={accounts}
        defaultDate={new Date('2026-07-20T00:00:00')}
      />,
    );

    expect(await screen.findByText('2026/07/20')).toBeTruthy();
  });

  it('未提供 defaultDate 時維持今天', async () => {
    render(
      <TransactionSheet
        isOpen
        onClose={() => {}}
        categories={categories}
        accounts={accounts}
      />,
    );

    const today = new Date();
    const expected = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    expect(await screen.findByText(expected)).toBeTruthy();
  });
});
