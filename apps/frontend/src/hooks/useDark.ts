'use client';

import { useTheme } from 'next-themes';

function useDark() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  return isDark;
}

export default useDark;
