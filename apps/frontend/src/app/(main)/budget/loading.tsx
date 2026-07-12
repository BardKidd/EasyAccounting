import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 space-y-6 max-w-[1600px] px-4 md:px-8">
      {/* Header（靜態文字與頁面一致，避免載入完成時閃跳） */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-outfit uppercase tracking-widest bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent drop-shadow-sm">
            預算
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            分配你的每一分錢
          </p>
        </div>

        {/* 月份導航 */}
        <Skeleton className="h-9 w-56 rounded-lg" />
      </div>

      {/* Ready-to-Assign 卡片 */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* Auto-Assign 工具列 */}
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Budget Table */}
      <Skeleton className="h-[400px] w-full rounded-2xl" />
    </Container>
  );
}
