import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProfileInfoCard } from './profileInfoCard';

vi.mock('@/services/authService', () => ({
  checkSession: vi.fn().mockResolvedValue({
    isSuccess: true,
    data: {
      name: '小明',
      email: 'ming@example.com',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    },
  }),
}));

const updateProfileMock = vi.fn().mockResolvedValue({
  isSuccess: true,
  data: { name: '新名字' },
  message: '個人資料已更新',
});
vi.mock('@/services/userService', () => ({
  updateProfile: (...args: any[]) => updateProfileMock(...args),
}));

beforeEach(() => {
  updateProfileMock.mockClear();
  localStorage.setItem(
    'user',
    JSON.stringify({ name: '小明', email: 'ming@example.com', isGuest: false }),
  );
});

test('顯示唯讀 email 與現有名稱', async () => {
  render(<ProfileInfoCard />);
  expect(await screen.findByDisplayValue('小明')).toBeInTheDocument();
  expect(screen.getByDisplayValue('ming@example.com')).toBeInTheDocument();
  expect(screen.getByDisplayValue('ming@example.com')).toBeDisabled();
});

test('名稱清空送出顯示驗證錯誤，不打 API', async () => {
  render(<ProfileInfoCard />);
  const nameInput = await screen.findByDisplayValue('小明');
  fireEvent.change(nameInput, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存變更' }));
  expect(await screen.findByText('使用者名稱為必填')).toBeInTheDocument();
  expect(updateProfileMock).not.toHaveBeenCalled();
});

test('送出成功呼叫 updateProfile 並更新 localStorage', async () => {
  render(<ProfileInfoCard />);
  const nameInput = await screen.findByDisplayValue('小明');
  fireEvent.change(nameInput, { target: { value: '新名字' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存變更' }));
  await waitFor(() =>
    expect(updateProfileMock).toHaveBeenCalledWith({ name: '新名字' }),
  );
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem('user')!).name).toBe('新名字'),
  );
});
