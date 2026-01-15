'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function RefreshButton() {
  const router = useRouter();

  return (
    <Button onClick={() => router.refresh()} variant="outline">
      重新整理
    </Button>
  );
}
