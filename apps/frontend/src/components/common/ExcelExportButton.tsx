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

      if (type === PageType.TRANSACTIONS) {
        const url = await service.getTransactionsExcelUrl();
        // 建立隱藏的 a 標籤來觸發下載
        const a = document.createElement('a');
        a.href = url;
        // 檔名會由瀏覽器根據網址或 Header 決定，這裡其實 Azure Blob 的 SAS URL 點擊就會下載
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('匯出成功！');
        return;
      }

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
        'cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-full shadow-lg shadow-emerald-500/20 transition-all active:scale-95',
        className,
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
