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
        'cursor-pointer bg-orange-600 hover:bg-orange-700 text-white h-11 rounded-full shadow-lg shadow-orange-500/20 transition-all active:scale-95',
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
