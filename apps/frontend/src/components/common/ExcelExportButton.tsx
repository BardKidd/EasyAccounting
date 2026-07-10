'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  Loader2,
  FileDown,
  FilePen,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import service from '@/services';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PageType, ExcelExportMode } from '@repo/shared';

interface ExcelExportButtonProps {
  type: PageType;
  className?: string;
}

export function ExcelExportButton({ type, className }: ExcelExportButtonProps) {
  const [loading, setLoading] = useState(false);

  // 以隱藏的 a 標籤觸發下載。檔名由 Azure Blob 的 SAS URL / Header 決定。
  const triggerDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExport = async (mode: ExcelExportMode) => {
    try {
      setLoading(true);
      toast.info(
        mode === ExcelExportMode.EDIT
          ? '正在準備編輯用 Excel...'
          : '正在準備匯出...',
      );

      if (type === PageType.TRANSACTIONS) {
        const url = await service.getTransactionsExcelUrl(mode);
        triggerDownload(url);
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

  const handleCsvExport = async () => {
    try {
      setLoading(true);
      toast.info('正在準備 CSV...');

      if (type === PageType.TRANSACTIONS) {
        const url = await service.getTransactionsCsvUrl();
        triggerDownload(url);
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={loading}
          className={cn(
            'cursor-pointer bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 h-11 rounded-full shadow-sm transition-all active:scale-95',
            className,
          )}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          匯出
          <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>選擇匯出方式</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer flex-col items-start gap-0.5"
          onClick={() => handleExport(ExcelExportMode.EXPORT)}
        >
          <span className="flex items-center gap-2 font-medium">
            <FileDown className="h-4 w-4" />
            匯出用
          </span>
          <span className="text-xs text-muted-foreground pl-6">
            純檢視 / 備份，不含交易 id
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer flex-col items-start gap-0.5"
          onClick={() => handleExport(ExcelExportMode.EDIT)}
        >
          <span className="flex items-center gap-2 font-medium">
            <FilePen className="h-4 w-4" />
            編輯用
          </span>
          <span className="text-xs text-muted-foreground pl-6">
            含隱藏 id，可修改後以「編輯」模式上傳
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer flex-col items-start gap-0.5"
          onClick={handleCsvExport}
        >
          <span className="flex items-center gap-2 font-medium">
            <FileSpreadsheet className="h-4 w-4" />
            匯出 CSV
          </span>
          <span className="text-xs text-muted-foreground pl-6">
            純資料，Mac Numbers 直接開
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
