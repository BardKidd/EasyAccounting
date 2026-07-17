import { useEffect, useState } from 'react';

// Tailwind sm breakpoint（640px）以下視為手機版面
const MOBILE_QUERY = '(max-width: 639px)';

/** SSR / 無 matchMedia 環境（jsdom）一律回傳 false（桌面版面）。 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
