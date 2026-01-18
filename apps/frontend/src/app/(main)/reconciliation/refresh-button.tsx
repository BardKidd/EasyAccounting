'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';

export function RefreshButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.refresh()}
      variant="outline"
      size="sm"
      className="h-9 gap-2 shadow-sm border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
    >
      <RotateCw className="h-3.5 w-3.5" />
      重新整理
    </Button>
  );
}
