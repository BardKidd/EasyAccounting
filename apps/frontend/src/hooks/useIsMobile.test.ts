import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('環境無 matchMedia（如 jsdom/SSR）時回傳 false', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('viewport 符合手機寬度時回傳 true', () => {
    const mql = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue(mql),
    );

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('viewport 變更時跟著更新', () => {
    let changeHandler: (() => void) | undefined;
    const mql = {
      matches: false,
      addEventListener: (_: string, cb: () => void) => {
        changeHandler = cb;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      mql.matches = true;
      changeHandler?.();
    });
    expect(result.current).toBe(true);
  });
});
