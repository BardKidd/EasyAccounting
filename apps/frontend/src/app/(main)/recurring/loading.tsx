import { RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 space-y-8 max-w-[1200px] px-4 md:px-8">
      {/* Header（靜態文字與頁面一致，避免載入完成時閃跳） */}
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase tracking-widest drop-shadow-sm">
            週期性交易
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            管理自動執行的定期收支規則
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4 w-full">
        {/* 工具列：左標題、右「新增週期事件」 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>週期性交易規則</span>
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>

        {/* 週期規則卡片列 */}
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
