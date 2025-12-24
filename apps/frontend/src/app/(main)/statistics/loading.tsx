import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 space-y-8">
      {/* Title */}
      {/* <div className="flex items-center justify-between space-y-2">
      <Skeleton className="my-8 h-9 w-[150px]" />
      </div>  In container title already exists */}

      <div className="space-y-6">
        {/* Statistics Header (Date Picker & Period Selector) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Date Display */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>

          {/* Period Selector */}
          <div className="flex items-center border rounded-md p-1 gap-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Tabs List */}
        <div className="grid w-full grid-cols-5 mb-6 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>

        {/* Overview Tab Content Skeleton */}
        <div className="space-y-6">
          {/* Summary Bar Chart */}
          <Skeleton className="h-[300px] w-full rounded-xl" />

          {/* Bottom Area: Pie Chart + List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart */}
            <div className="lg:col-span-2 p-6 border rounded-xl space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="flex justify-center">
                <Skeleton className="h-[250px] w-[250px] rounded-full" />
              </div>
            </div>

            {/* Top Expenses List */}
            <div className="lg:col-span-1 p-6 border rounded-xl space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
