import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { OfflineRetryButton } from './offline-retry-button';

// Fully static, self-contained. No API calls, no auth, no SWR — this must render from
// nothing but its own cached HTML + the global stylesheet when the network is gone
// (spec §4 / FR-3).
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '離線中 · EasyAccounting',
  robots: { index: false, follow: false },
};

const rippleCss = `
@keyframes ea-offline-ripple {
  0%   { transform: scale(0.55); opacity: 0.55; }
  80%  { opacity: 0; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes ea-offline-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
.ea-ripple { animation: ea-offline-ripple 3s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
.ea-ripple-2 { animation-delay: 1s; }
.ea-ripple-3 { animation-delay: 2s; }
.ea-float { animation: ea-offline-float 5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ea-ripple { animation: none; opacity: 0.25; }
  .ea-float { animation: none; }
}
`;

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-slate-50 px-6 text-center dark:bg-[#060c15]">
      <style dangerouslySetInnerHTML={{ __html: rippleCss }} />

      {/* Ambient glow — mirrors the app shell so /offline feels like the same product. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[10%] -top-[10%] h-[45%] w-[45%] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/15" />
        <div className="absolute -bottom-[10%] right-[5%] h-[40%] w-[40%] rounded-full bg-teal-500/10 blur-[110px] dark:bg-teal-500/15" />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center">
        {/* Signal beacon */}
        <div className="relative mb-10 flex h-36 w-36 items-center justify-center">
          <span
            className="ea-ripple absolute inset-0 rounded-full border border-emerald-500/40"
            aria-hidden
          />
          <span
            className="ea-ripple ea-ripple-2 absolute inset-0 rounded-full border border-emerald-500/30"
            aria-hidden
          />
          <span
            className="ea-ripple ea-ripple-3 absolute inset-0 rounded-full border border-teal-500/30"
            aria-hidden
          />
          <div className="ea-float relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 shadow-xl shadow-slate-300/30 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f172a]/70 dark:shadow-black/40">
            <WifiOff
              className="h-11 w-11 text-slate-400 dark:text-slate-500"
              strokeWidth={1.75}
            />
          </div>
        </div>

        <h1 className="font-outfit text-3xl font-bold tracking-tight text-slate-900 text-balance dark:text-slate-50">
          偵測不到網路連線
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 text-pretty dark:text-slate-300">
          本應用程式需要網路連線以確保您的帳務資料即時同步至雲端。請檢查您的
          Wi-Fi 或行動數據，並點選下方重試。
        </p>

        <div className="mt-10">
          <OfflineRetryButton />
        </div>
      </div>

      <p className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-10 text-xs text-slate-400 dark:text-slate-600">
        EasyAccounting · 離線模式
      </p>
    </main>
  );
}
