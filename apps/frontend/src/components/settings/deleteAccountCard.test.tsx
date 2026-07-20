import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DeleteAccountCard } from './deleteAccountCard';

const deleteAccountMock = vi.fn().mockResolvedValue({
  isSuccess: true,
  data: null,
  message: '帳號已刪除',
});
vi.mock('@/services/userService', () => ({
  deleteAccount: (...args: any[]) => deleteAccountMock(...args),
}));
vi.mock('@/lib/pushCleanup', () => ({
  clearPushOnLogout: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  deleteAccountMock.mockClear();
});

test('未輸入「刪除」時確認鈕 disabled', async () => {
  render(<DeleteAccountCard />);
  fireEvent.click(screen.getByRole('button', { name: '刪除帳號' }));
  const confirmBtn = await screen.findByRole('button', { name: '確認刪除' });
  expect(confirmBtn).toBeDisabled();
});

test('輸入「刪除」後可確認並呼叫 deleteAccount', async () => {
  render(<DeleteAccountCard />);
  fireEvent.click(screen.getByRole('button', { name: '刪除帳號' }));
  const input = await screen.findByPlaceholderText('請輸入「刪除」');
  fireEvent.change(input, { target: { value: '刪除' } });
  const confirmBtn = screen.getByRole('button', { name: '確認刪除' });
  expect(confirmBtn).not.toBeDisabled();
  fireEvent.click(confirmBtn);
  await waitFor(() => expect(deleteAccountMock).toHaveBeenCalledTimes(1));
});
