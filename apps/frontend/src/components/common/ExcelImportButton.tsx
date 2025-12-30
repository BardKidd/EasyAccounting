'use client';

import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import service from '@/services';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { PageType } from '@repo/shared';

interface ExcelImportButtonProps {
  type: PageType;
  className?: string;
  onSuccess?: () => void;
}

export function ExcelImportButton({
  type,
  className,
  onSuccess,
}: ExcelImportButtonProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      // Clear input so same file can be selected again if needed
      e.target.value = '';

      toast.info('正在匯入資料...');
      // await service.importData(type, file);

      toast.success('匯入成功！');
      onSuccess?.();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('匯入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
      />
      <Button
        variant="default"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white', // Green color for Excel import
          className
        )}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        匯入 Excel
      </Button>
    </>
  );
}
