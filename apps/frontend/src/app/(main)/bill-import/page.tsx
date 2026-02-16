'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FileUploader } from '@/components/bill-import/FileUploader';
import { PendingTransactionTable } from '@/components/bill-import/PendingTransactionTable';
import { useParseStatus, ParseStatusData } from '@/hooks/useParseStatus';
import {
  PendingTransaction,
  ParseStatus,
  CategoryType,
  AccountType,
} from '@repo/shared';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHandler } from '@/lib/utils';
import service from '@/services';

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
  const [isConfirming, setIsConfirming] = useState(false);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const [uploadContext, setUploadContext] = useState<{
    blobUrls: string[];
  } | null>(null);

  const status = useParseStatus(activeUploadId);

  useEffect(() => {
    fetchPendingTransactions();
    fetchDropdownData();
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

  const fetchDropdownData = async () => {
    try {
      const [cats, accs] = await Promise.all([
        service.getCategories(),
        service.getPersonnelAccounts(),
      ]);
      setCategories(cats);
      setAccounts(accs);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  const [localFiles, setLocalFiles] = useState<File[]>([]);

  const handleUpload = async (files: File[], password?: string) => {
    setIsUploading(true);
    const formData = new FormData();

    // 前端轉換 PDF → JPEG
    let filesToUpload: File[] = [];

    try {
      toast.info(password ? '正在嘗試使用密碼解鎖 PDF...' : '正在轉換 PDF...');
      const conversionPromises = files.map(async (file) => {
        if (file.type === 'application/pdf') {
          const blobs = await convertPdfToImages(file, password);
          return blobs.map(
            (blob, index) =>
              new File(
                [blob],
                `${file.name.replace('.pdf', '')}_page_${index + 1}.jpg`,
                { type: 'image/jpeg' },
              ),
          );
        }
        return [file];
      });

      const nestedFiles = await Promise.all(conversionPromises);
      filesToUpload = nestedFiles.flat();
    } catch (error: any) {
      console.error(error);
      if (error.name === 'PasswordRequiredError') {
        setLocalFiles(files);
        setUploadContext({ blobUrls: [] });
        setShowPasswordDialog(true);
        toast.warning('此 PDF 需要密碼，請輸入密碼');
        setIsUploading(false);
        return;
      }

      toast.error('PDF 轉換失敗');
      setIsUploading(false);
      return;
    }

    filesToUpload.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const domain = process.env.NEXT_PUBLIC_API_DOMAIN || '/api';
      const url = `${domain}/pdf/upload`;

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();

      if (data.isSuccess) {
        const { uploadId, blobUrls } = data.data;

        setUploadContext({ blobUrls });

        // Trigger Parse
        await apiHandler(`/pdf/parse/${uploadId}`, 'post', {
          blobUrls,
        });

        setActiveUploadId(uploadId);
        toast.success('上傳成功，開始解析...');
        setLocalFiles([]);
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
      if (localFiles.length > 0) {
        setShowPasswordDialog(false);
        await handleUpload(localFiles, password);
        return;
      }
    } catch (error) {
      toast.error('密碼錯誤或 PDF 無法解析');
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
    if (!selectedAccountId) {
      toast.warning('請先選擇匯入帳戶');
      return;
    }

    setIsConfirming(true);
    try {
      const res = await apiHandler('/pdf/confirm', 'post', {
        transactionIds: confirmedIds,
        accountId: selectedAccountId,
      });
      if (res.isSuccess) {
        toast.success(`成功匯入 ${res.data.created} 筆交易`);
        setTransactions([]); // Clear list
        setActiveUploadId(null);
      }
    } catch (error) {
      toast.error('匯入失敗');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAddManual = async () => {
    try {
      const res = await apiHandler('/pdf/pending', 'post', {
        uploadBatchId: activeUploadId,
      });
      if (res.isSuccess) {
        setTransactions((prev) => [res.data, ...prev]);
        toast.success('已新增空白交易，請填寫資料');
      }
    } catch (error) {
      toast.error('新增失敗');
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
              <Button variant="outline" size="sm" onClick={handleAddManual}>
                <Plus className="mr-1 h-4 w-4" />
                手動新增
              </Button>
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
              <Button
                onClick={handleConfirm}
                disabled={isDiscarding || isConfirming}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    匯入中...
                  </>
                ) : (
                  '確認匯入全部'
                )}
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
            categories={categories}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
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
