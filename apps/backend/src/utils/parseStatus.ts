import { EventEmitter } from 'events';
import { ParseStatus } from '@repo/shared';

/**
 * 解析狀態管理（In-Memory）
 *
 * 用途：
 * 1. 追蹤每個 uploadId 的解析狀態
 * 2. 透過 EventEmitter 通知 SSE 連線推送狀態給前端
 *
 * 注意：
 * - 單 process 架構下 Worker 和 API 在同一個 process，直接用 EventEmitter 即可
 * - 如果未來 API 和 Worker 拆成不同 process，需改用 Redis Pub/Sub
 */

export interface ParseStatusData {
  status: `${ParseStatus}`;
  uploadId: string;
  progress?: number; // 0-100
  pendingCount?: number; // completed 時回傳
  error?: string; // failed 時回傳
  position?: number; // queued 時的排隊位置
}

// EventEmitter 用來通知 SSE 連線
const emitter = new EventEmitter();
// 避免 MaxListenersExceededWarning（多個 SSE 同時連線時）
emitter.setMaxListeners(100);

// In-memory 狀態儲存
const statusMap = new Map<string, ParseStatusData>();

/**
 * 更新解析狀態並通知所有監聽者
 *
 * Worker 處理過程中呼叫此函數，SSE endpoint 會收到事件並推送給前端
 */
export const updateParseStatus = (data: ParseStatusData): void => {
  statusMap.set(data.uploadId, data);
  emitter.emit(`status:${data.uploadId}`, data);

  // completed / failed 後 5 分鐘清除，避免 memory leak
  if (
    data.status === ParseStatus.COMPLETED ||
    data.status === ParseStatus.FAILED
  ) {
    setTimeout(
      () => {
        statusMap.delete(data.uploadId);
      },
      5 * 60 * 1000,
    );
  }
};

/**
 * 取得目前的解析狀態
 */
export const getParseStatus = (
  uploadId: string,
): ParseStatusData | undefined => {
  return statusMap.get(uploadId);
};

/**
 * 監聽狀態變更（SSE endpoint 用）
 *
 * 回傳 cleanup function，SSE 斷線時呼叫
 */
export const onStatusChange = (
  uploadId: string,
  listener: (data: ParseStatusData) => void,
): (() => void) => {
  const eventName = `status:${uploadId}`;
  emitter.on(eventName, listener);

  return () => {
    emitter.off(eventName, listener);
  };
};
