import { AuditAction, AuditEntityType } from '../constants';

// 單一欄位變更（UPDATE 時由後端 diff 計算，前端直接顯示）。
export interface AuditChange {
  field: string;
  from: unknown;
  to: unknown;
}

// 一筆稽核紀錄（前後端共用）。對應 backend src/models/auditLog.ts 的 Mongoose schema。
// before / after 為實體快照：CREATE → before=null；DELETE → after=null。
export interface AuditLogType {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  // 人類可讀摘要，例：「新增支出 NT$1,200・午餐」。
  summary: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: AuditChange[];
  createdAt: string;
}

export interface AuditLogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogListResponse {
  items: AuditLogType[];
  pagination: AuditLogPagination;
}
