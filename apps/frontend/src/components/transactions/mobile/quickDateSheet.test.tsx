import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickDateSheet } from './quickDateSheet';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const sameYmd = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

describe('QuickDateSheet', () => {
  it('顯示今天／昨天／前天快速鍵', () => {
    render(
      <QuickDateSheet
        open
        onOpenChange={() => {}}
        date={new Date()}
        time="12:30:00"
        onDateChange={() => {}}
        onTimeChange={() => {}}
      />,
    );

    expect(screen.getByText('今天')).toBeTruthy();
    expect(screen.getByText('昨天')).toBeTruthy();
    expect(screen.getByText('前天')).toBeTruthy();
  });

  it('點「昨天」回報昨天日期並關閉', () => {
    const onDateChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <QuickDateSheet
        open
        onOpenChange={onOpenChange}
        date={new Date()}
        time="12:30:00"
        onDateChange={onDateChange}
        onTimeChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('昨天'));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(onDateChange).toHaveBeenCalledTimes(1);
    expect(sameYmd(onDateChange.mock.calls[0]![0], yesterday)).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('預設不顯示日曆，點「選其他日期」才展開', () => {
    render(
      <QuickDateSheet
        open
        onOpenChange={() => {}}
        date={new Date()}
        time="12:30:00"
        onDateChange={() => {}}
        onTimeChange={() => {}}
      />,
    );

    expect(screen.queryByRole('grid')).toBeNull();
    fireEvent.click(screen.getByText(/選其他日期/));
    expect(screen.getByRole('grid')).toBeTruthy();
  });

  it('改時間回報 onTimeChange', () => {
    const onTimeChange = vi.fn();
    render(
      <QuickDateSheet
        open
        onOpenChange={() => {}}
        date={new Date()}
        time="12:30:00"
        onDateChange={() => {}}
        onTimeChange={onTimeChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('時間'), {
      target: { value: '08:15:00' },
    });
    expect(onTimeChange).toHaveBeenCalledWith('08:15:00');
  });
});
