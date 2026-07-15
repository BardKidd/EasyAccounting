import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Account, AccountType } from '@repo/shared';
import { AccountPickerSheet } from './accountPickerSheet';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const makeAccount = (
  id: string,
  name: string,
  type: Account,
  balance = 1000,
): AccountType => ({
  id,
  userId: 'u1',
  name,
  type,
  balance,
  currencyCode: 'TWD',
  icon: 'Wallet',
  color: '#10b981',
  isArchived: false,
  onBudget: true,
});

const accounts: AccountType[] = [
  makeAccount('cash', '現金', Account.CASH),
  makeAccount('bank', '台新 Richart', Account.BANK),
  makeAccount('card', '玉山信用卡', Account.CREDIT_CARD),
];

describe('AccountPickerSheet', () => {
  it('依帳戶類型分組顯示所有帳戶', () => {
    render(
      <AccountPickerSheet
        open
        onOpenChange={() => {}}
        accounts={accounts}
        value=""
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /現金/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /台新 Richart/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /玉山信用卡/ })).toBeTruthy();
  });

  it('點帳戶回報 id 並關閉', () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AccountPickerSheet
        open
        onOpenChange={onOpenChange}
        accounts={accounts}
        value=""
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('台新 Richart'));
    expect(onSelect).toHaveBeenCalledWith('bank');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('excludeId 的帳戶不顯示（轉帳目標排除來源）', () => {
    render(
      <AccountPickerSheet
        open
        onOpenChange={() => {}}
        accounts={accounts}
        value=""
        onSelect={() => {}}
        excludeId="cash"
      />,
    );

    expect(screen.queryByText('現金')).toBeNull();
    expect(screen.getByText('台新 Richart')).toBeTruthy();
  });

  it('目前選取的帳戶標記 aria-pressed', () => {
    render(
      <AccountPickerSheet
        open
        onOpenChange={() => {}}
        accounts={accounts}
        value="card"
        onSelect={() => {}}
      />,
    );

    expect(
      screen
        .getByText('玉山信用卡')
        .closest('button')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
  });
});
