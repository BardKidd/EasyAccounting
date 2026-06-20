import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  AuditLogListResponse,
  ListAuditLogsQuery,
} from '@repo/shared';

/**
 * 讀取登入者的稽核 / 變更歷史（分頁）。對應後端 GET /api/audit-logs。
 * 後端資料存於 MongoDB（sharded），此處透過 apiHandler 直接打後端。
 */
export const getAuditLogs = async (
  query: Partial<ListAuditLogsQuery> = {},
): Promise<AuditLogListResponse> => {
  const params = new URLSearchParams();
  if (query.entityType) params.set('entityType', String(query.entityType));
  if (query.action) params.set('action', String(query.action));
  if (query.entityId) params.set('entityId', query.entityId);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const qs = params.toString();
  const result = (await apiHandler(
    `/audit-logs${qs ? `?${qs}` : ''}`,
    'get',
    null,
  )) as ResponseHelper<AuditLogListResponse>;

  if (result.isSuccess) return result.data;
  throw new Error(result.message);
};
