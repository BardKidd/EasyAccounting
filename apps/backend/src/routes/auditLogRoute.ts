import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { listAuditLogsQuerySchema } from '@repo/shared';
import auditLogController from '@/controllers/auditLogController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.get(
  '/audit-logs',
  authMiddleware,
  validate(listAuditLogsQuerySchema, 'query'),
  auditLogController.listAuditLogs,
);

export default router;
