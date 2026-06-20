import { z } from 'zod';
import {
  AuditAction,
  AuditEntityType,
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  AUDIT_LOG_MAX_PAGE_SIZE,
} from '../constants';

// ---------- List Query ----------
// audit log 讀取 API 的查詢參數。皆選填；page 從 1 起算，limit 封頂避免一次撈爆。
export const listAuditLogsQuerySchema = z.object({
  entityType: z.nativeEnum(AuditEntityType).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  // 指定某筆實體的完整變更歷史（搭配 entityType 使用，命中複合索引）。
  entityId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(AUDIT_LOG_MAX_PAGE_SIZE)
    .optional()
    .default(AUDIT_LOG_DEFAULT_PAGE_SIZE),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
