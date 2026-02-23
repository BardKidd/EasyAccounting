import { useState, useEffect, useRef } from 'react';
import { ParseStatus } from '@repo/shared';
import { toast } from 'sonner';
import { apiHandler } from '@/lib/utils';

export interface ParseStatusData {
  uploadId: string;
  status: ParseStatus;
  progress?: number;
  pendingCount?: number;
  error?: string;
  details?: string;
}

const POLL_INTERVAL = 5000; // 5 秒

/**
 * SSE 即時監聽解析狀態，斷線時自動 fallback 到 polling。
 * 完成時觸發 Web Notification（若使用者已授權）。
 */
export function useParseStatus(uploadId: string | null) {
  const [status, setStatus] = useState<ParseStatusData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Polling fallback ---
  const startPolling = (id: string) => {
    if (pollRef.current) return; // 已經在 polling

    console.log(`SSE disconnected, fallback to polling for ${id}`);

    pollRef.current = setInterval(async () => {
      try {
        const res = await apiHandler(`/pdf/pending?limit=1`, 'get', null);
        if (!res.isSuccess) return;

        const { activeJob } = res.data;
        if (!activeJob) {
          // 已完成或不存在 → 直接視為 completed
          setStatus((prev) => ({
            uploadId: id,
            status: ParseStatus.COMPLETED,
            pendingCount: prev?.pendingCount,
          }));
          stopPolling();
          return;
        }

        if (activeJob.status === 'COMPLETED') {
          setStatus({
            uploadId: id,
            status: ParseStatus.COMPLETED,
            pendingCount: 0,
          });
          stopPolling();
        } else if (activeJob.status === 'FAILED') {
          setStatus({
            uploadId: id,
            status: ParseStatus.FAILED,
            error: '解析失敗',
          });
          stopPolling();
        }
        // PROCESSING → 繼續 polling
      } catch (err) {
        console.error('Polling error', err);
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // --- Web Notification ---
  const sendNotification = (data: ParseStatusData) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    if (data.status === ParseStatus.COMPLETED) {
      new Notification('帳單解析完成', {
        body: `已識別 ${data.pendingCount || 0} 筆交易，點擊確認`,
        icon: '/favicon.ico',
      });
    } else if (data.status === ParseStatus.FAILED) {
      new Notification('帳單解析失敗', {
        body: data.error || '未知錯誤',
        icon: '/favicon.ico',
      });
    }
  };

  useEffect(() => {
    if (!uploadId) {
      setStatus(null);
      stopPolling();
      return;
    }

    const domain = process.env.NEXT_PUBLIC_API_DOMAIN || '/api';
    const eventSource = new EventSource(`${domain}/pdf/stream/${uploadId}`, {
      withCredentials: true,
    });

    let sseConnected = false;
    let errorCount = 0;

    eventSource.onopen = () => {
      console.log(`SSE connection opened for ${uploadId}`);
      sseConnected = true;
      errorCount = 0;
      stopPolling(); // SSE 恢復時停止 polling
    };

    eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as ParseStatusData;
        setStatus(data);

        if (data.status === ParseStatus.COMPLETED) {
          toast.success('解析完成', {
            description: `成功識別 ${data.pendingCount || 0} 筆交易`,
          });
          sendNotification(data);
          eventSource.close();
          stopPolling();
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    });

    eventSource.addEventListener('error', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data && data.status === ParseStatus.FAILED) {
          setStatus(data);
          toast.error('解析失敗', {
            description: data.error || 'Unknown error',
          });
          sendNotification(data);
          eventSource.close();
          stopPolling();
          return;
        }
      } catch {
        // Genuine connection error — SSE 斷線
        errorCount++;
        if (errorCount >= 3) {
          console.warn(
            'SSE failed 3 times, closing and falling back to polling',
          );
          eventSource.close();
          startPolling(uploadId);
        }
      }
    });

    return () => {
      eventSource.close();
      stopPolling();
    };
  }, [uploadId]);

  return status;
}
