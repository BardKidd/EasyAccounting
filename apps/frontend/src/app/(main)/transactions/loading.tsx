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
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Calendar Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-md overflow-hidden">
        {/* Calendar Toolbar */}
        <div className="flex items-center justify-between p-4 px-6 bg-teal-50/50 dark:bg-teal-950/20">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid (5 rows x 7 columns) */}
        {Array.from({ length: 5 }).map((_, weekIdx) => (
          <div
            key={weekIdx}
            className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
          >
            {Array.from({ length: 7 }).map((_, dayIdx) => (
              <div
                key={dayIdx}
                className="min-h-[100px] p-2 border-r border-slate-100 dark:border-slate-800 last:border-r-0"
              >
                {/* Date Number */}
                <Skeleton className="h-5 w-5 rounded-full mb-2" />
                {/* Random Events */}
                {(weekIdx + dayIdx) % 3 === 0 && (
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-full rounded-md" />
                    {(weekIdx + dayIdx) % 2 === 0 && (
                      <Skeleton className="h-5 w-3/4 rounded-md" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Container>
  );
}
