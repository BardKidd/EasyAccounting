import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MobileMonthCalendar } from './mobileMonthCalendar';
import { DayIndicators } from '@/lib/calendarUtils';

const indicators = new Map<string, DayIndicators>([
  ['2026-07-15', { expense: true, income: false, transfer: true }],
  ['2026-07-25', { expense: false, income: true, transfer: false }],
]);

const renderCalendar = (
  onSelectDate = vi.fn(),
  onNavigate = vi.fn(),
  selectedDate = '2026-07-15',
) => {
  render(
    <MobileMonthCalendar
      date={new Date('2026-07-15T00:00:00')}
      selectedDate={selectedDate}
      indicators={indicators}
      onSelectDate={onSelectDate}
      onNavigate={onNavigate}
    />,
  );
  return { onSelectDate, onNavigate };
};

describe('MobileMonthCalendar', () => {
  it('顯示月份標題與整月日期（含前後月補位）', () => {
    renderCalendar();

    expect(screen.getByText('2026年 7月')).toBeTruthy();
    // 2026-07-01 是週三，週日起算 → 前補 6/28–6/30
    expect(screen.getByTestId('mobile-day-2026-06-28')).toBeTruthy();
    expect(screen.getByTestId('mobile-day-2026-07-01')).toBeTruthy();
    expect(screen.getByTestId('mobile-day-2026-07-31')).toBeTruthy();
    expect(screen.getByTestId('mobile-day-2026-08-01')).toBeTruthy();
  });

  it('依 indicators 顯示類型小點', () => {
    renderCalendar();

    const day15 = screen.getByTestId('mobile-day-2026-07-15');
    expect(within(day15).getByTestId('dot-expense')).toBeTruthy();
    expect(within(day15).getByTestId('dot-transfer')).toBeTruthy();
    expect(within(day15).queryByTestId('dot-income')).toBeNull();

    const day25 = screen.getByTestId('mobile-day-2026-07-25');
    expect(within(day25).getByTestId('dot-income')).toBeTruthy();

    const day10 = screen.getByTestId('mobile-day-2026-07-10');
    expect(within(day10).queryByTestId('dot-expense')).toBeNull();
  });

  it('標記選取日', () => {
    renderCalendar();

    expect(
      screen
        .getByTestId('mobile-day-2026-07-15')
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByTestId('mobile-day-2026-07-20')
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('點日期呼叫 onSelectDate', () => {
    const { onSelectDate } = renderCalendar();

    fireEvent.click(screen.getByTestId('mobile-day-2026-07-20'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-20');
  });

  it('點前後月補位日也回傳該日字串', () => {
    const { onSelectDate } = renderCalendar();

    fireEvent.click(screen.getByTestId('mobile-day-2026-08-01'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-08-01');
  });

  it('上/下月與今天按鈕呼叫 onNavigate', () => {
    const { onNavigate } = renderCalendar();

    fireEvent.click(screen.getByRole('button', { name: '上個月' }));
    expect(onNavigate.mock.calls[0][0].getMonth()).toBe(5); // June

    fireEvent.click(screen.getByRole('button', { name: '下個月' }));
    expect(onNavigate.mock.calls[1][0].getMonth()).toBe(7); // August

    fireEvent.click(screen.getByRole('button', { name: '今天' }));
    expect(onNavigate).toHaveBeenCalledTimes(3);
  });
});
