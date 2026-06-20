import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import auditLogService from '@/services/auditLogService';
import type { ListAuditLogsQuery } from '@repo/shared';

/**
 * GET /api/audit-logs — 讀取登入者的稽核 / 變更歷史（分頁）。
 * query 已由 validate(listAuditLogsQuerySchema, 'query') 正規化（含 page/limit 預設）。
 */
const listAuditLogs = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const data = await auditLogService.listAuditLogs(
      userId,
      req.query as unknown as ListAuditLogsQuery,
    );
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, data, 'Audit logs retrieved', null));
  });
};

export default { listAuditLogs };
