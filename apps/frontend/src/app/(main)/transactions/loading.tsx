import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-9 w-[150px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>

      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>

        {/* Table Header */}
        <div className="border rounded-md">
          <div className="h-12 border-b bg-muted/50 px-4 flex items-center">
            <Skeleton className="h-4 w-full" />
          </div>
          {/* Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 border-b px-4 flex items-center space-x-4"
            >
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-[200px] flex-1" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
