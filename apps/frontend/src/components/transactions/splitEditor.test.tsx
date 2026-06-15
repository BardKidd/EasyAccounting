import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitEditor } from './splitEditor';
import { CategoryType, RootType } from '@repo/shared';

const categories: CategoryType[] = [
  {
    id: 'root',
    name: '支出',
    type: RootType.EXPENSE,
    children: [
      { id: 'c1', name: '食材', type: RootType.EXPENSE, children: [] },
      { id: 'c2', name: '日用品', type: RootType.EXPENSE, children: [] },
    ],
  } as any,
];

const renderEditor = (
  value: { categoryId: string; amount: number }[],
  totalAmount: number,
  onChange = vi.fn(),
) => {
  render(
    <SplitEditor
      categories={categories}
      type={RootType.EXPENSE}
      totalAmount={totalAmount}
      value={value}
      onChange={onChange}
    />,
  );
  return onChange;
};

describe('SplitEditor', () => {
  it('子項加總等於總額時顯示「已配平」', () => {
    renderEditor(
      [
        { categoryId: 'c1', amount: 800 },
        { categoryId: 'c2', amount: 400 },
      ],
      1200,
    );
    expect(screen.getByText('已配平')).toBeInTheDocument();
  });

  it('未配平時顯示剩餘金額', () => {
    renderEditor(
      [
        { categoryId: 'c1', amount: 800 },
        { categoryId: 'c2', amount: 300 },
      ],
      1200,
    );
    expect(screen.getByText(/剩餘\s*100/)).toBeInTheDocument();
  });

  it('「新增子項」呼叫 onChange 並多一列', () => {
    const onChange = renderEditor(
      [
        { categoryId: 'c1', amount: 800 },
        { categoryId: 'c2', amount: 400 },
      ],
      1200,
    );
    fireEvent.click(screen.getByRole('button', { name: /新增子項/ }));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].length).toBe(3);
  });

  it('「平均分配」讓子項加總等於總額', () => {
    const onChange = renderEditor(
      [
        { categoryId: 'c1', amount: 0 },
        { categoryId: 'c2', amount: 0 },
      ],
      1000,
    );
    fireEvent.click(screen.getByRole('button', { name: '平均分配' }));
    const rows = onChange.mock.calls[0][0];
    expect(rows[0].amount + rows[1].amount).toBeCloseTo(1000, 2);
  });
});
