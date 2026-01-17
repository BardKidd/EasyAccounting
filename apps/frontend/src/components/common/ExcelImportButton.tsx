'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CloudUpload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
} from 'lucide-react';
import importExportService from '@/services/importExport';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExcelImportButtonProps {
  shouldRefresh?: boolean;
}

interface ImportResult {
  successCount: number;
  failureCount: number;
  errorUrl?: string;
  message: string;
}

export default function ExcelImportButton({
  shouldRefresh = false,
}: ExcelImportButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // 延遲重置，避免動畫還沒結束就閃爍
      setTimeout(() => {
        setSelectedFile(null);
        setResult(null);
        setIsLoading(false);
      }, 300);
    }
  };

  const validateFile = (file: File) => {
    if (
      file.type !==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      !file.name.endsWith('.xlsx')
    ) {
      toast.error('請上傳 Excel 檔案 (.xlsx)');
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setResult(null);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 使用 useCallback 可以防止在重新渲染時再次被定義。
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setResult(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      const res = await importExportService.importTransactions(selectedFile);

      // Parse message to get counts (Assume message format: "成功匯入 X 筆交易紀錄，失敗 Y 筆")
      // Backend return: `成功匯入 ${successRows.length} 筆交易紀錄，失敗 ${errorRows.length} 筆`
      const successMatch = res.message.match(/成功匯入 (\d+) 筆/);
      const failureMatch = res.message.match(/失敗 (\d+) 筆/);

      const successCount = successMatch ? parseInt(successMatch[1]) : 0;
      const failureCount = failureMatch ? parseInt(failureMatch[1]) : 0;

      setResult({
        successCount,
        failureCount,
        errorUrl: res.errorUrl,
        message: res.message,
      });

      if (res.isSuccess && !res.errorUrl) {
        toast.success('匯入成功');
      } else if (res.errorUrl) {
        toast.warning('部分資料匯入失敗');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || '匯入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadErrorNetwork = () => {
    if (result?.errorUrl) {
      window.open(result.errorUrl, '_blank');
    }
  };

  const handleCloseAndRefresh = () => {
    setIsOpen(false);
    if (shouldRefresh && result?.successCount && result.successCount > 0) {
      router.refresh();
    }
    setResult(null);
    setSelectedFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-full shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
          <CloudUpload className="h-4 w-4" />
          匯入 Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>匯入交易紀錄</DialogTitle>
          <DialogDescription>
            請上傳 Excel 檔案以匯入交易， 允許部分成功來上傳交易紀錄 <br />
            <span className="text-sm text-red-600">
              若有資料格式錯誤，系統將產生錯誤報告供您下載修正。修正完畢可將該檔案原檔上傳。
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Result View */}
          {result ? (
            <div className="space-y-4">
              <div
                className={cn(
                  'rounded-lg border p-4 flex flex-col items-center gap-2 text-center',
                  result.failureCount > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200',
                )}
              >
                {result.failureCount > 0 ? (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                )}
                <div
                  className={cn(
                    'font-medium text-lg',
                    result.failureCount > 0
                      ? 'text-yellow-600'
                      : 'text-green-600',
                  )}
                >
                  匯入完成
                </div>
                <div className="text-sm text-gray-600">
                  成功：
                  <span className="font-bold text-green-600">
                    {result.successCount}
                  </span>{' '}
                  筆{' / '}
                  失敗：
                  <span className="font-bold text-red-600">
                    {result.failureCount}
                  </span>{' '}
                  筆
                </div>
              </div>

              {result.failureCount > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg border text-sm space-y-3">
                  <p className="font-medium flex items-center gap-2 text-slate-700">
                    <Download className="h-4 w-4" />
                    下載錯誤報告
                  </p>
                  <p className="text-slate-500">
                    部分資料驗證失敗。請下載錯誤報告
                    Excel，直接在該檔案中修正錯誤（錯誤欄位已標示黃色），儲存後
                    <span className="font-bold text-slate-700">
                      {' '}
                      可直接重新上傳該檔案{' '}
                    </span>
                    補登失敗的資料。
                  </p>
                  <Button
                    className="w-full gap-2 border shadow-sm bg-white hover:bg-slate-50 cursor-pointer"
                    onClick={handleDownloadErrorNetwork}
                  >
                    <Download className="h-4 w-4" />
                    下載錯誤 Excel
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Upload View */
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50',
                selectedFile ? 'bg-slate-50 border-solid border-slate-300' : '',
              )}
              // 拖著檔案在上面經過或停留就會觸發
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              // 拖移的檔案從這邊抓到
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx"
                className="hidden"
              />

              {selectedFile ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-green-600" />
                  <div className="text-center">
                    <div className="font-medium text-slate-900">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    移除
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-100 rounded-full">
                    <CloudUpload className="h-6 w-6 text-slate-600" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-sm text-slate-900">
                      點擊選擇或拖曳檔案至此
                    </p>
                    <p className="text-xs text-slate-500">支援 .xlsx 格式</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {result ? (
            <Button
              onClick={handleCloseAndRefresh}
              className="min-w-[80px] cursor-pointer"
            >
              關閉
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => handleCloseAndRefresh}
                disabled={isLoading}
                className="cursor-pointer"
              >
                取消
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isLoading}
                className="min-w-[80px] cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    處理中
                  </>
                ) : (
                  '開始匯入'
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
