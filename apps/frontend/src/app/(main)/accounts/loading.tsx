import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-9 w-[150px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="space-y-6">
        {/* Simulate 3 account groups */}
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-col space-y-2">
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block space-y-1">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
}
