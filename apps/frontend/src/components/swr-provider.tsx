'use client';

import { SWRConfig } from 'swr';

/**
 * 全域 SWR 預設。個別 useSWR 仍可覆寫。
 * 目的：切換頁面時走快取、不再每次閃 skeleton / 重抓。
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // 視窗重新聚焦不自動重抓（alt-tab / 切分頁回來不製造請求風暴）
        revalidateOnFocus: false,
        // key 變動時先保留舊資料，避免切換時白屏 / skeleton 閃爍
        keepPreviousData: true,
        // 5 秒內相同 key 不重複發請求（短時間切回同頁直接命中快取）
        dedupingInterval: 5000,
        // 錯誤重試上限（預設會無限退避重試，收斂一下）
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
