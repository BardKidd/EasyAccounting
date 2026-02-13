'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FileUploader } from '@/components/bill-import/FileUploader';
import { PendingTransactionTable } from '@/components/bill-import/PendingTransactionTable';
import { useParseStatus, ParseStatusData } from '@/hooks/useParseStatus';
import { PendingTransaction, ParseStatus } from '@repo/shared';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHandler } from '@/lib/utils';

import { PasswordDialog } from '@/components/bill-import/PasswordDialog';
import { convertPdfToImages } from '@/lib/pdfUtils';

export default function BillImportPage() {
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const [uploadContext, setUploadContext] = useState<{
    blobUrls: string[];
    processingMode: 'local' | 'cloud';
  } | null>(null);

  const status = useParseStatus(activeUploadId);

  useEffect(() => {
    fetchPendingTransactions();
  }, []);

  // Poll for pending transactions when status is completed
  useEffect(() => {
    if (status?.status === ParseStatus.COMPLETED) {
      fetchPendingTransactions();
    }
    if (status?.status === ParseStatus.PASSWORD_REQUIRED) {
      setShowPasswordDialog(true);
    }
  }, [status]);

  const fetchPendingTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const res = await apiHandler('/pdf/pending?limit=100', 'get', null);
      if (res.isSuccess) {
        setTransactions(res.data.data);
      }
    } catch (error) {
      toast.error('無法載入待確認交易');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const [localFiles, setLocalFiles] = useState<File[]>([]);

  const handleUpload = async (
    files: File[],
    mode: 'local' | 'cloud',
    password?: string,
  ) => {
    setIsUploading(true);
    const formData = new FormData();

    // Process files based on mode
    let filesToUpload: File[] = [];

    if (mode === 'local') {
      try {
        toast.info(
          password ? '正在嘗試使用密碼解鎖 PDF...' : '正在本地轉換 PDF...',
        );
        const conversionPromises = files.map(async (file) => {
          if (file.type === 'application/pdf') {
            const blobs = await convertPdfToImages(file, password);
            // Convert blobs to File objects
            return blobs.map(
              (blob, index) =>
                new File(
                  [blob],
                  `${file.name.replace('.pdf', '')}_page_${index + 1}.jpg`,
                  { type: 'image/jpeg' },
                ),
            );
          }
          return [file]; // If it's already an image, just return it
        });

        const nestedFiles = await Promise.all(conversionPromises);
        filesToUpload = nestedFiles.flat();
      } catch (error: any) {
        console.error(error);
        if (error.name === 'PasswordRequiredError') {
          // Store files causing error to retry later
          setLocalFiles(files);
          setUploadContext({
            blobUrls: [], // No blobs yet
            processingMode: 'local',
          });
          setShowPasswordDialog(true);
          toast.warning('此 PDF 需要密碼，請輸入密碼');
          setIsUploading(false);
          return;
        }

        toast.error('本地 PDF 轉換失敗');
        setIsUploading(false);
        return;
      }
    } else {
      filesToUpload = files;
    }

    filesToUpload.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const domain = process.env.NEXT_PUBLIC_API_DOMAIN || '/api';
      const url = new URL(`${domain}/pdf/upload`);
      if (mode) url.searchParams.append('mode', mode);

      const res = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
        credentials: 'include', // Important for cookies/auth
      });
      // Handle non-ResponseHelper response (e.g. 404 from proxy if domain not set)
      // But assuming backend returns standard JSON or ResponseHelper
      const data = await res.json();

      if (data.isSuccess) {
        const { uploadId, blobUrls, blobUrl } = data.data;
        const targetUploadId = uploadId;
        const urls = mode === 'local' ? blobUrls : [blobUrl];

        // Store context for retry
        setUploadContext({
          blobUrls: urls,
          processingMode: mode,
        });

        // Trigger Parse
        await apiHandler(`/pdf/parse/${targetUploadId}`, 'post', {
          blobUrls: urls,
          processingMode: mode,
          password, // Pass password to backend if available (though for local mode it's already used)
        });

        // If apiHandler throws, it goes to catch block. If it returns, it's success.
        setActiveUploadId(targetUploadId);
        toast.success('上傳成功，開始解析...');
        setLocalFiles([]); // Clear local files on success
      } else {
        toast.error(data.message || '上傳失敗');
      }
    } catch (error) {
      toast.error('上傳發生錯誤');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    setIsPasswordSubmitting(true);
    try {
      // Local Mode Retry
      if (uploadContext?.processingMode === 'local' && localFiles.length > 0) {
        setShowPasswordDialog(false);
        await handleUpload(localFiles, 'local', password);
        return;
      }

      // Cloud Mode (Backend) Retry
      if (!activeUploadId || !uploadContext) return;

      await apiHandler(`/pdf/parse/${activeUploadId}`, 'post', {
        blobUrls: uploadContext.blobUrls,
        processingMode: uploadContext.processingMode,
        password,
      });

      toast.success('密碼發送成功，重新解析中...');
      setShowPasswordDialog(false);
    } catch (error) {
      toast.error('密碼發送失敗，請重試');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleUpdateTransaction = async (
    id: string,
    updates: Partial<PendingTransaction>,
  ) => {
    // Optimistic update
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)),
    );

    try {
      await apiHandler(`/pdf/pending/${id}`, 'patch', updates);
    } catch (error) {
      toast.error('更新失敗');
      // Revert?
    }
  };

  const handleConfirm = async () => {
    const confirmedIds = transactions
      .filter((tx) => tx.status !== 'SKIPPED')
      .map((tx) => tx.id);
    if (confirmedIds.length === 0) {
      toast.warning('沒有可確認的交易');
      return;
    }

    try {
      const res = await apiHandler('/pdf/confirm', 'post', {
        transactionIds: confirmedIds,
      });
      if (res.isSuccess) {
        toast.success(`成功匯入 ${res.data.count} 筆交易`);
        setTransactions([]); // Clear list
        setActiveUploadId(null);
      }
    } catch (error) {
      toast.error('匯入失敗');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('確定要捨棄所有待確認交易嗎？此操作無法復原。')) return;

    setIsDiscarding(true);
    try {
      const res = await apiHandler('/pdf/pending', 'delete', null);
      if (res.isSuccess) {
        toast.success('已捨棄所有交易');
        setTransactions([]);
        setActiveUploadId(null);
      }
    } catch (error) {
      toast.error('捨棄失敗');
    } finally {
      setIsDiscarding(false);
    }
  };

  const isProcessing = status?.status === ParseStatus.PROCESSING;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">帳單匯入</h1>
        {isProcessing && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI 解析中... {status?.progress}%</span>
          </div>
        )}
      </div>

      <FileUploader
        onUpload={handleUpload}
        isUploading={isUploading || isProcessing}
      />

      <PasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onSubmit={handlePasswordSubmit}
        isSubmitting={isPasswordSubmitting}
      />

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-semibold">
            待確認交易 ({transactions.length})
          </h2>
          {transactions.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleClearAll}
                disabled={isDiscarding}
              >
                {isDiscarding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    捨棄中...
                  </>
                ) : (
                  '全部捨棄'
                )}
              </Button>
              <Button onClick={handleConfirm} disabled={isDiscarding}>
                確認匯入全部
              </Button>
            </div>
          )}
        </div>

        {isLoadingTransactions ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>正在載入交易紀錄...</p>
          </div>
        ) : transactions.length > 0 ? (
          <PendingTransactionTable
            transactions={transactions}
            onUpdate={handleUpdateTransaction}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>目前沒有待確認的交易</p>
          </div>
        )}
      </div>
    </div>
  );
}
