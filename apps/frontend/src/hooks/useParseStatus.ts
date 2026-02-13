import { useState, useEffect, useCallback } from 'react';
import { ParseStatus } from '@repo/shared';
import { toast } from 'sonner';

export interface ParseStatusData {
  uploadId: string;
  status: ParseStatus;
  progress?: number;
  pendingCount?: number;
  error?: string;
  details?: string;
}

export function useParseStatus(uploadId: string | null) {
  const [status, setStatus] = useState<ParseStatusData | null>(null);

  useEffect(() => {
    if (!uploadId) {
      setStatus(null);
      return;
    }

    const domain = process.env.NEXT_PUBLIC_API_DOMAIN || '/api';
    const eventSource = new EventSource(`${domain}/pdf/stream/${uploadId}`, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      console.log(`SSE connection opened for ${uploadId}`);
    };

    eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setStatus(data);

        if (data.status === ParseStatus.COMPLETED) {
          toast.success('解析完成', {
            description: `成功識別 ${data.pendingCount || 0} 筆交易`,
          });
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    });

    eventSource.addEventListener('error', (e) => {
      // SSE error event usually means connection issue or server sent 'error' type
      // But here we also defined 'error' type in backend
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data && data.status === ParseStatus.FAILED) {
          setStatus(data);
          toast.error('解析失敗', {
            description: data.error || 'Unknown error',
          });
          eventSource.close();
          return;
        }
      } catch (err) {
        // Genuine connection error
        console.error('SSE Connection error', e);
        // Retry is handled by browser automatically for creating connection,
        // but we might want to close if it keeps failing.
        // For now, let it be.
      }
    });

    return () => {
      eventSource.close();
    };
  }, [uploadId]);

  return status;
}
