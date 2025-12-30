'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import service from '@/services';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PageType } from '@repo/shared';

interface ExcelExportButtonProps {
  type: PageType;
  className?: string;
}

export function ExcelExportButton({ type, className }: ExcelExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      toast.info('正在準備匯出...');

      // const blob = await service.exportData(type);

      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `export_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);

      toast.success('匯出成功！');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('匯出失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      className={cn(
        'cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white',
        className
      )}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      匯出 Excel
    </Button>
  );
}
