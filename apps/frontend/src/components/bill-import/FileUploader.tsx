'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ElegantLoader } from '@/components/ui/elegant-loader';

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
  progress?: number;
  loadingMessage?: string;
}

export function FileUploader({
  onUpload,
  isUploading,
  progress,
  loadingMessage,
}: FileUploaderProps) {
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
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative overflow-hidden border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-300 group',
          isDragActive
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
            : 'border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5',
          isUploading && 'pointer-events-none opacity-50',
        )}
      >
        {/* Glow effect on hover/drag */}
        <div className="absolute inset-0 bg-linear-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 relative z-10 transition-transform duration-300 group-hover:scale-105">
          {isUploading ? (
            <div className="py-6 w-full">
              <ElegantLoader
                message={loadingMessage || '處理中...'}
                fullScreen={false}
                progress={progress}
              />
            </div>
          ) : (
            <>
              <div className="p-5 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/30">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-xl text-slate-800 dark:text-slate-200 font-outfit tracking-wide">
                  點擊或拖曳 PDF 檔案至此
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  支援多個 PDF 檔案，將在您的裝置上轉換為圖片
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
