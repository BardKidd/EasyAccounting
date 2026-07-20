import { resolveSettingsTab } from './settingsTabs';

test('有效 tab 值原樣回傳', () => {
  expect(resolveSettingsTab('profile')).toBe('profile');
  expect(resolveSettingsTab('categories')).toBe('categories');
  expect(resolveSettingsTab('notifications')).toBe('notifications');
  expect(resolveSettingsTab('currency')).toBe('currency');
  expect(resolveSettingsTab('tags')).toBe('tags');
});

test('無效值 / 未帶 / 陣列一律 fallback categories', () => {
  expect(resolveSettingsTab('hacker')).toBe('categories');
  expect(resolveSettingsTab(undefined)).toBe('categories');
  expect(resolveSettingsTab(['profile', 'tags'])).toBe('categories');
});
