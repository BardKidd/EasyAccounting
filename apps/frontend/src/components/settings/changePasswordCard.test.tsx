import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ChangePasswordCard } from './changePasswordCard';

const changePasswordMock = vi.fn().mockResolvedValue({
  isSuccess: true,
  data: null,
  message: '密碼已更新，請重新登入',
});
vi.mock('@/services/userService', () => ({
  changePassword: (...args: any[]) => changePasswordMock(...args),
}));
vi.mock('@/lib/pushCleanup', () => ({
  clearPushOnLogout: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  changePasswordMock.mockClear();
});

const fill = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

test('兩次新密碼不一致顯示錯誤，不打 API', async () => {
  render(<ChangePasswordCard />);
  fill('目前密碼', 'old-password');
  fill('新密碼', 'NewPassword123');
  fill('確認新密碼', 'Different123');
  fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));
  expect(await screen.findByText('兩次輸入的密碼不一致')).toBeInTheDocument();
  expect(changePasswordMock).not.toHaveBeenCalled();
});

test('新密碼過短顯示錯誤', async () => {
  render(<ChangePasswordCard />);
  fill('目前密碼', 'old-password');
  fill('新密碼', 'short');
  fill('確認新密碼', 'short');
  fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));
  expect(
    await screen.findByText('密碼至少需要 8 個字元'),
  ).toBeInTheDocument();
  expect(changePasswordMock).not.toHaveBeenCalled();
});

test('成功送出只帶 currentPassword/newPassword', async () => {
  render(<ChangePasswordCard />);
  fill('目前密碼', 'old-password');
  fill('新密碼', 'NewPassword123');
  fill('確認新密碼', 'NewPassword123');
  fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));
  await waitFor(() =>
    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'NewPassword123',
    }),
  );
});
