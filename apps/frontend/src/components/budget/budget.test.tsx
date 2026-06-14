import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { BudgetMonthView, AccountType } from '@repo/shared';
import { Account as AccountEnum } from '@repo/shared';
import { AvailablePill } from './AvailablePill';
import { OverspendingBanner } from './OverspendingBanner';
import { BudgetMonthNav } from './BudgetMonthNav';
import { ReadyToAssignCard } from './ReadyToAssignCard';
import { AssignedCell } from './AssignedCell';
import { BudgetTable } from './BudgetTable';
import { MoveMoneyPopover } from './MoveMoneyPopover';
import { CreditCardPaymentSection } from './CreditCardPaymentSection';
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
  it('顯示月底沖銷提示（預設 cash）', () => {
    render(<OverspendingBanner />);
    expect(screen.getByText(/下月可分配金額扣除/)).toBeInTheDocument();
  });

  it('Phase 2 ④：credit 變體顯示卡債提示、both 兩段皆顯示', () => {
    const { rerender } = render(<OverspendingBanner kind="credit" />);
    expect(screen.getByText(/累積為卡債/)).toBeInTheDocument();
    expect(screen.queryByText(/下月可分配金額扣除/)).toBeNull();

    rerender(<OverspendingBanner kind="both" />);
    expect(screen.getByText(/下月可分配金額扣除/)).toBeInTheDocument();
    expect(screen.getByText(/累積為卡債/)).toBeInTheDocument();
  });
});

describe('CreditCardPaymentSection', () => {
  it('無卡時不渲染；有卡時列出撥備/可付與卡債標籤（Phase 2 ④）', () => {
    const { container, rerender } = render(
      <CreditCardPaymentSection
        rows={[]}
        baseCurrencyCode="TWD"
        onAssign={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();

    const onAssign = vi.fn().mockResolvedValue(undefined);
    rerender(
      <CreditCardPaymentSection
        rows={[
          {
            accountId: 'visa',
            name: 'Visa',
            assigned: 0,
            activity: -30,
            available: -600,
            covered: 0,
            payments: 30,
            isDebt: true,
          },
        ]}
        baseCurrencyCode="TWD"
        onAssign={onAssign}
      />,
    );
    expect(screen.getByText('信用卡付款')).toBeInTheDocument();
    expect(screen.getByText('Visa')).toBeInTheDocument();
    expect(screen.getByText('卡債')).toBeInTheDocument();
    // 撥備：點 cell 的 button 進入編輯、送出
    const cell = screen.getByTestId('cc-assigned-cell');
    fireEvent.click(within(cell).getByRole('button'));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAssign).toHaveBeenCalledWith('visa', 500);
  });
});

describe('BudgetMonthNav', () => {
  it('邊界月份停用對應按鈕（start..maxMonth）', () => {
    const onChange = vi.fn();
    render(
      <BudgetMonthNav
        startMonth="2026-05-01"
        currentMonth="2026-06-01"
        maxMonth="2027-06-01"
        value="2026-05-01"
        onChange={onChange}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled(); // 起始月不可再往前
    expect(buttons[1]).not.toBeDisabled();

    fireEvent.click(buttons[1]!);
    expect(onChange).toHaveBeenCalledWith('2026-06-01');
  });

  it('Phase 2：可導覽至未來月份，並標示「未來」徽章', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BudgetMonthNav
        startMonth="2026-05-01"
        currentMonth="2026-06-01"
        maxMonth="2027-06-01"
        value="2026-06-01"
        onChange={onChange}
      />,
    );
    const buttons = screen.getAllByRole('button');
    // 當月時下一步仍可按（未來月份開放）
    expect(buttons[1]).not.toBeDisabled();
    fireEvent.click(buttons[1]!);
    expect(onChange).toHaveBeenCalledWith('2026-07-01');
    // 當月不顯示未來徽章
    expect(screen.queryByTestId('future-badge')).toBeNull();

    // 切到未來月份顯示徽章，且抵達上界時停用下一步
    rerender(
      <BudgetMonthNav
        startMonth="2026-05-01"
        currentMonth="2026-06-01"
        maxMonth="2027-06-01"
        value="2027-06-01"
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId('future-badge')).toBeInTheDocument();
    expect(screen.getAllByRole('button')[1]).toBeDisabled(); // 已達 maxMonth
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
      target: null,
      underfunded: 0,
      overspendKind: null,
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
      target: { type: 'REFILL', amount: 500, dueDate: null },
      underfunded: 300,
      overspendKind: 'cash',
    },
  ],
  unclassifiedTransferOut: { activity: -2000, available: -2000 },
  creditCardPayments: [],
  creditOverspending: 0,
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
        onUpsertTarget={vi.fn()}
        onDeleteTarget={vi.fn()}
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
        onUpsertTarget={vi.fn()}
        onDeleteTarget={vi.fn()}
      />,
    );
    expect(screen.queryByText('轉出（未分類）')).not.toBeInTheDocument();
  });

  it('Phase 2 ③：有 target 的列顯示摘要與 underfunded 缺口，點缺口快速補足到 assigned+underfunded', () => {
    const onAssign = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetTable
        data={mockView}
        month="2026-06-01"
        baseCurrencyCode="TWD"
        onAssign={onAssign}
        onMove={vi.fn()}
        onUpsertTarget={vi.fn()}
        onDeleteTarget={vi.fn()}
      />,
    );
    // cat-b（交通）target=REFILL 500、underfunded 300
    expect(screen.getByText(/補滿到/)).toBeInTheDocument();
    const fill = screen.getByTestId('underfunded-fill');
    expect(fill).toHaveTextContent('差');
    fireEvent.click(fill);
    // assigned 200 + underfunded 300 = 500
    expect(onAssign).toHaveBeenCalledWith('cat-b', 500);
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
