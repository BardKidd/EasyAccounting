'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface FileUploaderProps {
  onUpload: (files: File[], mode: 'local' | 'cloud') => Promise<void>;
  isUploading: boolean;
}

export function FileUploader({ onUpload, isUploading }: FileUploaderProps) {
  const [mode, setMode] = useState<'local' | 'cloud'>('cloud');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Basic client-side validation logic before passing to parent
      if (mode === 'cloud' && acceptedFiles.length > 1) {
        toast.error('雲端模式只能上傳一個 PDF 檔案');
        return;
      }

      const pdfFiles = acceptedFiles.filter(
        (f) => f.type === 'application/pdf',
      );
      if (pdfFiles.length !== acceptedFiles.length) {
        toast.error('只允許上傳 PDF 檔案');
        return;
      }

      onUpload(acceptedFiles, mode);
    },
    [mode, onUpload],
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      accept: {
        'application/pdf': ['.pdf'],
      },
      maxFiles: mode === 'cloud' ? 1 : undefined,
    });

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-end space-x-2">
        <Label
          htmlFor="mode-switch"
          className={cn(
            'text-sm transition-colors',
            mode === 'local'
              ? 'text-foreground font-medium'
              : 'text-muted-foreground',
          )}
        >
          本地解析
        </Label>
        <Switch
          id="mode-switch"
          checked={mode === 'cloud'}
          onCheckedChange={(checked) => setMode(checked ? 'cloud' : 'local')}
        />
        <Label
          htmlFor="mode-switch"
          className={cn(
            'text-sm transition-colors',
            mode === 'cloud'
              ? 'text-foreground font-medium'
              : 'text-muted-foreground',
          )}
        >
          雲端解析
        </Label>
      </div>

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
              {isUploading ? '處理中...' : '點擊或拖曳檔案至此'}
            </p>
            <p className="text-sm text-muted-foreground">
              {mode === 'local'
                ? '支援多個 PDF 檔案 (本地轉檔)'
                : '支援單個大型 PDF 檔案 (雲端處理)'}
            </p>
          </div>
        </div>
      </div>

      {/* File List Warning: Simplification */}
    </div>
  );
}
