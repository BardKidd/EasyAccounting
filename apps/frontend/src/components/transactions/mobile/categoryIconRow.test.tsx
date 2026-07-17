import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryType, RootType } from '@repo/shared';
import { CategoryIconRow } from './categoryIconRow';

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

const mains: CategoryType[] = [
  makeCategory('food', '餐飲', [
    makeCategory('lunch', '午餐'),
    makeCategory('dinner', '晚餐'),
  ]),
  makeCategory('fun', '娛樂'),
];

describe('CategoryIconRow', () => {
  it('主分類列顯示所有主分類，且沒有返回鈕', () => {
    render(
      <CategoryIconRow
        mains={mains}
        mainCategory=""
        subCategory=""
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('餐飲')).toBeTruthy();
    expect(screen.getByText('娛樂')).toBeTruthy();
    expect(screen.queryByLabelText('返回主分類')).toBeNull();
  });

  it('點無子分類的主分類直接選定', () => {
    const onSelect = vi.fn();
    render(
      <CategoryIconRow
        mains={mains}
        mainCategory=""
        subCategory=""
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('娛樂'));
    expect(onSelect).toHaveBeenCalledWith('fun', '');
  });

  it('點有子分類的主分類切到子分類列並出現返回鈕', () => {
    const onSelect = vi.fn();
    render(
      <CategoryIconRow
        mains={mains}
        mainCategory=""
        subCategory=""
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('餐飲'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByLabelText('返回主分類')).toBeTruthy();
    expect(screen.getByText('午餐')).toBeTruthy();
    expect(screen.getByText('全部餐飲')).toBeTruthy();
    expect(screen.queryByText('娛樂')).toBeNull();
  });

  it('子分類列點子分類回報主＋子 id', () => {
    const onSelect = vi.fn();
    render(
      <CategoryIconRow
        mains={mains}
        mainCategory=""
        subCategory=""
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('餐飲'));
    fireEvent.click(screen.getByText('午餐'));
    expect(onSelect).toHaveBeenCalledWith('food', 'lunch');
  });

  it('子分類列點「全部○○」只選主分類', () => {
    const onSelect = vi.fn();
    render(
      <CategoryIconRow
        mains={mains}
        mainCategory=""
        subCategory=""
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('餐飲'));
    fireEvent.click(screen.getByText('全部餐飲'));
    expect(onSelect).toHaveBeenCalledWith('food', '');
  });

  it('點返回回到主分類列，返回鈕消失', () => {
    render(
      <CategoryIconRow
        mains={mains}
        mainCategory=""
        subCategory=""
        onSelect={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('餐飲'));
    fireEvent.click(screen.getByLabelText('返回主分類'));

    expect(screen.getByText('娛樂')).toBeTruthy();
    expect(screen.queryByLabelText('返回主分類')).toBeNull();
  });

  it('編輯模式帶入子分類時直接停在子分類列且亮選', () => {
    render(
      <CategoryIconRow
        mains={mains}
        mainCategory="food"
        subCategory="lunch"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByLabelText('返回主分類')).toBeTruthy();
    expect(
      screen.getByText('午餐').closest('button')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('mains 更換（切交易類型）時回到主分類列', () => {
    const incomeMains = [makeCategory('salary', '薪資')];
    const { rerender } = render(
      <CategoryIconRow
        mains={mains}
        mainCategory=""
        subCategory=""
        onSelect={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('餐飲'));
    expect(screen.getByLabelText('返回主分類')).toBeTruthy();

    rerender(
      <CategoryIconRow
        mains={incomeMains}
        mainCategory=""
        subCategory=""
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('薪資')).toBeTruthy();
    expect(screen.queryByLabelText('返回主分類')).toBeNull();
  });
});
