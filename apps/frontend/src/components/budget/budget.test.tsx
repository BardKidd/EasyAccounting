import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { BudgetMonthView, AccountType } from '@repo/shared';
import { Account as AccountEnum } from '@repo/shared';
import { AvailablePill } from './AvailablePill';
import { OverspendingBanner } from './OverspendingBanner';
import { BudgetMonthNav } from './BudgetMonthNav';
import { ReadyToAssignCard } from './ReadyToAssignCard';
import { AssignedCell } from './AssignedCell';
import { BudgetTable } from './BudgetTable';
import { MoveMoneyPopover } from './MoveMoneyPopover';
import { InitBudgetDialog } from './InitBudgetDialog';

// CategoryActivitySheet 內部用 SWR + services，整合層測試不在此涵蓋
vi.mock('./CategoryActivitySheet', () => ({
  CategoryActivitySheet: () => null,
}));

// sonner toast 在 MoveMoneyPopover / InitBudgetDialog 提交時呼叫
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AvailablePill', () => {
  it('正=綠、零=灰、負=紅（spec §7）', () => {
    const { rerender } = render(
      <AvailablePill value={100} formatted="NT$100" />,
    );
    expect(screen.getByText('NT$100').className).toContain('emerald');

    rerender(<AvailablePill value={0} formatted="NT$0" />);
    expect(screen.getByText('NT$0').className).toContain('slate');

    rerender(<AvailablePill value={-50} formatted="-NT$50" />);
    expect(screen.getByText('-NT$50').className).toContain('red');
  });
});

describe('OverspendingBanner', () => {
  it('顯示月底沖銷提示', () => {
    render(<OverspendingBanner />);
    expect(screen.getByText(/下月可分配金額扣除/)).toBeInTheDocument();
  });
});

describe('BudgetMonthNav', () => {
  it('邊界月份停用對應按鈕（start..當月）', () => {
    const onChange = vi.fn();
    render(
      <BudgetMonthNav
        startMonth="2026-05-01"
        currentMonth="2026-06-01"
        value="2026-05-01"
        onChange={onChange}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled(); // 不可再往前
    expect(buttons[1]).not.toBeDisabled();

    fireEvent.click(buttons[1]!);
    expect(onChange).toHaveBeenCalledWith('2026-06-01');
  });
});

describe('ReadyToAssignCard', () => {
  it('RTA 負值顯示警告文案', () => {
    render(
      <ReadyToAssignCard
        readyToAssign={-500}
        rtaBreakdown={{
          startingBalance: 1000,
          cumulativeInflow: 0,
          cumulativeAssigned: 1500,
          priorOverspending: 0,
        }}
        baseCurrencyCode="TWD"
      />,
    );
    expect(screen.getByText(/超過可用資金/)).toBeInTheDocument();
  });

  it('RTA 歸零顯示完成文案', () => {
    render(
      <ReadyToAssignCard
        readyToAssign={0}
        rtaBreakdown={{
          startingBalance: 1000,
          cumulativeInflow: 0,
          cumulativeAssigned: 1000,
          priorOverspending: 0,
        }}
        baseCurrencyCode="TWD"
      />,
    );
    expect(screen.getByText(/每一分錢都有歸屬/)).toBeInTheDocument();
  });
});

describe('AssignedCell', () => {
  it('點擊進入編輯，Enter 提交新值', () => {
    const onSubmit = vi.fn();
    render(<AssignedCell value={100} formatted="NT$100" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('NT$100'));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith(250);
  });

  it('值未變不提交；Escape 取消', () => {
    const onSubmit = vi.fn();
    render(<AssignedCell value={100} formatted="NT$100" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('NT$100'));
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('NT$100'));
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Escape' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

const mockView: BudgetMonthView = {
  month: '2026-06-01',
  startMonth: '2026-05-01',
  readyToAssign: 19300,
  rtaBreakdown: {
    startingBalance: 20000,
    cumulativeInflow: 5800,
    cumulativeAssigned: 4000,
    priorOverspending: -2500,
  },
  rows: [
    {
      categoryId: 'cat-a',
      name: '飲食',
      icon: 'utensils',
      color: '#ff0000',
      assigned: 300,
      activity: 0,
      available: 300,
      isOverspent: false,
    },
    {
      categoryId: 'cat-b',
      name: '交通',
      icon: 'car',
      color: '#00ff00',
      assigned: 200,
      activity: -1500,
      available: -300,
      isOverspent: true,
    },
  ],
  unclassifiedTransferOut: { activity: -2000, available: -2000 },
  totals: { assigned: 500, activity: -3500, available: 0 },
};

describe('BudgetTable', () => {
  it('渲染分類列、虛擬轉出列與合計', () => {
    render(
      <BudgetTable
        data={mockView}
        month="2026-06-01"
        baseCurrencyCode="TWD"
        onAssign={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    expect(screen.getByText('飲食')).toBeInTheDocument();
    expect(screen.getByText('交通')).toBeInTheDocument();
    expect(screen.getByText('轉出（未分類）')).toBeInTheDocument();
    expect(screen.getByText('合計')).toBeInTheDocument();
  });

  it('無跨邊界轉出時不顯示虛擬列', () => {
    render(
      <BudgetTable
        data={{ ...mockView, unclassifiedTransferOut: null }}
        month="2026-06-01"
        baseCurrencyCode="TWD"
        onAssign={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    expect(screen.queryByText('轉出（未分類）')).not.toBeInTheDocument();
  });
});

describe('MoveMoneyPopover', () => {
  it('預設「移出 + RTA」：填金額送出 → onMove(本信封, null, amount)', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    render(
      <MoveMoneyPopover rows={mockView.rows} currentCategoryId="cat-a" onMove={onMove}>
        <button>open</button>
      </MoveMoneyPopover>,
    );
    fireEvent.click(screen.getByText('open'));
    const amount = await screen.findByPlaceholderText('0');
    fireEvent.change(amount, { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /確認轉移/ }));

    await waitFor(() =>
      expect(onMove).toHaveBeenCalledWith('cat-a', null, 300),
    );
  });

  it('金額非正數：擋下提交、不呼叫 onMove', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    render(
      <MoveMoneyPopover rows={mockView.rows} currentCategoryId="cat-a" onMove={onMove}>
        <button>open</button>
      </MoveMoneyPopover>,
    );
    fireEvent.click(screen.getByText('open'));
    const amount = await screen.findByPlaceholderText('0');
    fireEvent.change(amount, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /確認轉移/ }));

    await waitFor(() =>
      expect(screen.getByText('金額須為正數')).toBeInTheDocument(),
    );
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe('InitBudgetDialog', () => {
  const accounts = [
    { id: 'a1', name: '現金', type: AccountEnum.CASH, onBudget: true, isArchived: false },
    { id: 'a2', name: '證券', type: '證券戶', onBudget: false, isArchived: false },
  ] as unknown as AccountType[];

  it('起始月預設當月、帳戶依 onBudget 預設勾選；送出回傳 overrides', async () => {
    const onInit = vi.fn().mockResolvedValue(undefined);
    render(
      <InitBudgetDialog
        open
        onOpenChange={vi.fn()}
        accounts={accounts}
        onInit={onInit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '啟用預算' }));

    await waitFor(() => expect(onInit).toHaveBeenCalled());
    const [startMonth, overrides] = onInit.mock.calls[0]!;
    expect(startMonth).toMatch(/^\d{4}-\d{2}-01$/);
    expect(overrides).toEqual(
      expect.arrayContaining([
        { accountId: 'a1', onBudget: true },
        { accountId: 'a2', onBudget: false },
      ]),
    );
  });

  it('取消勾選帳戶後該帳戶 override 變 false', async () => {
    const onInit = vi.fn().mockResolvedValue(undefined);
    render(
      <InitBudgetDialog
        open
        onOpenChange={vi.fn()}
        accounts={accounts}
        onInit={onInit}
      />,
    );

    // a1 預設勾選 → 取消（第一個 checkbox）
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(screen.getByRole('button', { name: '啟用預算' }));

    await waitFor(() => expect(onInit).toHaveBeenCalled());
    const [, overrides] = onInit.mock.calls[0]!;
    expect(overrides).toContainEqual({ accountId: 'a1', onBudget: false });
  });
});
