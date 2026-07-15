import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 max-md:py-0 space-y-8 max-md:space-y-6 max-w-[1600px] px-4 max-md:px-0 md:px-8">
      {/* 桌面標題列 */}
      <div className="hidden md:flex items-center justify-between">
        <Skeleton className="h-9 w-[120px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* 手機：總資產 Hero + 本月摘要條 */}
      <div className="md:hidden space-y-3">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-[68px] w-full rounded-2xl" />
      </div>

      {/* 手機：帳戶橫捲卡 */}
      <div className="md:hidden space-y-3">
        <Skeleton className="h-5 w-12" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] w-40 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* 桌面：2x2 / 4 欄摘要卡 */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      {/* 手機：近期交易清單 */}
      <div className="md:hidden space-y-3">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />
        ))}
      </div>

      <div className="space-y-4 max-md:space-y-6">
        <Skeleton className="h-[340px] md:h-[350px] w-full rounded-xl" />

        <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="lg:col-span-3 h-[500px] rounded-xl" />
          <Skeleton className="lg:col-span-4 h-[500px] rounded-xl" />
        </div>
      </div>
    </Container>
  );
}
