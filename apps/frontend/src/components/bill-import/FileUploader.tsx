'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
}

export function FileUploader({ onUpload, isUploading }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const pdfFiles = acceptedFiles.filter(
        (f) => f.type === 'application/pdf',
      );
      if (pdfFiles.length !== acceptedFiles.length) {
        toast.error('只允許上傳 PDF 檔案');
        return;
      }

      onUpload(acceptedFiles);
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          isUploading && 'pointer-events-none opacity-50',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          {isUploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <div className="p-4 bg-muted rounded-full">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-1">
            <p className="font-medium">
              {isUploading ? '處理中...' : '點擊或拖曳 PDF 檔案至此'}
            </p>
            <p className="text-sm text-muted-foreground">
              支援多個 PDF 檔案，將在您的裝置上轉換為圖片
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
