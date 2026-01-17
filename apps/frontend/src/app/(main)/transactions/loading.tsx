import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-11 w-full sm:w-[260px] rounded-md" />
          <Skeleton className="h-11 w-full sm:w-[180px] rounded-md" />
          <Skeleton className="h-11 w-full sm:w-[180px] rounded-md" />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md shadow-lg overflow-hidden">
          <div className="h-12 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 px-4 flex items-center">
            {/* Header cells */}
            <div className="w-1/6">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="w-1/6">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="w-1/6">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="w-1/6">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="w-1/6">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="w-1/6">
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          {/* Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-slate-100 dark:border-white/5 px-4 flex items-center hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-1/6">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="w-1/6 flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="w-1/6">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="w-1/6">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="w-1/6">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="w-1/6 flex justify-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
