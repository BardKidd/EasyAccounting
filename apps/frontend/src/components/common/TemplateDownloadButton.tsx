'use client';

import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import service from '@/services';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TemplateDownloadButtonProps {
  className?: string;
}

export function TemplateDownloadButton({
  className,
}: TemplateDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      toast.info('正在準備範本...');

      const url = await service.getTransactionTemplateUrl();

      const a = document.createElement('a');
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('範本下載成功！');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('下載失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      className={cn(
        'cursor-pointer bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 h-11 rounded-full shadow-sm transition-all active:scale-95',
        className,
      )}
      title="下載匯入範本"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      下載範本
    </Button>
  );
}
