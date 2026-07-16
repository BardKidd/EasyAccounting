export const SETTINGS_TABS = [
  'categories',
  'notifications',
  'currency',
  'tags',
  'profile',
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

// tab 深連結白名單：無效值或未帶參數一律回 categories（維持現行預設）
export function resolveSettingsTab(
  param: string | string[] | undefined,
): SettingsTab {
  return typeof param === 'string' &&
    (SETTINGS_TABS as readonly string[]).includes(param)
    ? (param as SettingsTab)
    : 'categories';
}
