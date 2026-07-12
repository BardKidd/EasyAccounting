import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 space-y-8 max-w-[1100px] px-4 md:px-8">
      {/* Header（靜態文字與頁面一致，避免載入完成時閃跳） */}
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase tracking-widest drop-shadow-sm">
            變更歷史
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            交易等資料的建立、修改與刪除稽核紀錄
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 篩選列（動作 / 類型 chips） */}
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`action-${i}`} className="h-8 w-14 rounded-full" />
          ))}
          <span className="mx-1 h-5 w-px bg-slate-300/50 dark:bg-white/10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`type-${i}`} className="h-8 w-14 rounded-full" />
          ))}
        </div>

        {/* 稽核紀錄列 */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </Container>
  );
}
