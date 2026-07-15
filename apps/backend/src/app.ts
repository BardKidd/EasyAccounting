import express from 'express';
import path from 'path';
import cors from 'cors';
import { loggerMiddleware } from '@/middlewares/loggerMiddleware';
import mongoConnection from '@/utils/mongodb';
import { connectAuditMongo } from '@/utils/auditMongo';

import '@/models';

import userRoute from '@/routes/userRoute';
import categoryRoute from '@/routes/categoryRoute';
import announcementRoute from '@/routes/announcementRoute';
import accountRoute from '@/routes/accountRoute';
import transactionRoute from '@/routes/transactionRoute';
import authRoute from '@/routes/authRoute';
import cookieParser from 'cookie-parser';
import statisticsRoute from '@/routes/statisticsRoute';
import deployHealthRoute from '@/routes/deployHealthRoute';
import personnelNotificationRoute from '@/routes/personnelNotificationRoute';
import excelRoute from '@/routes/excelRoute';
import reconciliationRoute from '@/routes/reconciliationRoute';
import pdfRoute from '@/routes/pdfRoute';
import recurringTemplateRoute from '@/routes/recurringTemplateRoute';
import chatRoute from '@/routes/chatRoute';
import currencyRoute from '@/routes/currencyRoute';
import budgetRoute from '@/routes/budgetRoute';
import tagRoute from '@/routes/tagRoute';
import merchantMappingRoute from '@/routes/merchantMappingRoute';
import transactionRuleRoute from '@/routes/transactionRuleRoute';
import auditLogRoute from '@/routes/auditLogRoute';
import notificationRoute from '@/routes/notificationRoute';
import {
  startDailyReminderCronJobs,
  startMonthlyAnalysisNoticeCronJobs,
  startWeeklySummaryNoticeCronJobs,
} from './cron/notificationCron';
import { startRecurringTransactionCronJob } from './cron/recurringCron';
import { startGuestCleanupCronJob } from './cron/guestCleanupCron';
import { startExchangeRateCronJob } from './cron/exchangeRateCron';
import { initBillParseWorker } from '@/worker';

const app: express.Application = express();

// Trust proxy — 確保在 Load Balancer 後方正確取得 Client IP，1 代表信任第一層代理 (Azure 的 Envoy)
app.set('trust proxy', 1);

// Security fix (fix#28)：隱藏 X-Powered-By，並為所有回應補上基本安全標頭。
// API-only 服務不需要 CSP；HSTS 僅在 production（HTTPS）啟用。
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=15552000; includeSubDomains',
    );
  }
  next();
});

// CORS 設定
// prod：僅允許 ORIGIN_URL 白名單（可逗號分隔多筆）做完全比對。
// dev/test：額外放行任意 localhost / 127.0.0.1 / [::1]（任意埠），
//           前端換埠或環境殘留的舊 ORIGIN_URL 都不會再誤擋。
const isProductionCors = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ORIGIN_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// 錨定起訖，避免 evil-localhost.com / localhost.attacker.com 之類繞過
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

console.log(
  `[CORS] env=${process.env.NODE_ENV ?? 'development'} allowedOrigins=${JSON.stringify(
    allowedOrigins,
  )} devLocalhost=${!isProductionCors}`,
);

app.use(
  cors({
    origin: (origin, callback) => {
      // 無 origin（curl、server-to-server、健康檢查）一律放行
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        (!isProductionCors && LOCALHOST_ORIGIN.test(origin));

      if (isAllowed) return callback(null, true);

      // 不 throw：回 (null, false) 讓 cors 不附 ACAO header，瀏覽器自然擋下，
      // 但 HTTP 狀態維持正常，不會變成 500 + HTML stack trace（throw 會進 error handler）
      console.log(
        `[CORS BLOCK] Origin: '${origin}', Allowed: ${JSON.stringify(
          allowedOrigins,
        )}, devLocalhost: ${!isProductionCors}`,
      );
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(loggerMiddleware);

app.use('/api', categoryRoute);
app.use('/api', userRoute);
app.use('/api', announcementRoute);
app.use('/api', accountRoute);
app.use('/api', transactionRoute);
app.use('/api', authRoute);
app.use('/api', statisticsRoute);
app.use('/api', personnelNotificationRoute);
app.use('/api', excelRoute);
app.use('/api', reconciliationRoute);
app.use('/api', deployHealthRoute);
app.use('/api', pdfRoute);
app.use('/api', recurringTemplateRoute);
app.use('/api', chatRoute);
app.use('/api', currencyRoute);
app.use('/api', budgetRoute);
app.use('/api', tagRoute);
app.use('/api', merchantMappingRoute);
app.use('/api', transactionRuleRoute);
app.use('/api', auditLogRoute);
app.use('/api', notificationRoute);

// env 沒設定預設直接通過。這樣 PRD DEV 都不用去改了。
console.log('[App] Starting Cron Jobs...');
startDailyReminderCronJobs();
startWeeklySummaryNoticeCronJobs();
startMonthlyAnalysisNoticeCronJobs();
startRecurringTransactionCronJob();
startGuestCleanupCronJob();
startExchangeRateCronJob();

// 啟動 Bill Parse Worker (同 process)
// CI / test 環境不需要啟動 Worker
console.log('[Debug] Env check at worker init:', {
  NODE_ENV: process.env.NODE_ENV,
  hasSBUrl: !!process.env.AZURE_SERVICE_BUS_CONNECTION_STRING,
});
if (
  process.env.NODE_ENV !== 'test' &&
  process.env.AZURE_SERVICE_BUS_CONNECTION_STRING
) {
  initBillParseWorker();
} else {
  console.log(
    '[Worker] Skipped (non-production or missing Service Bus config)',
  );
}

export { app };

const startServer = async () => {
  try {
    await mongoConnection();

    // Audit log 專用連線（本地 sharded cluster）。非必要服務：連不上不擋 server 啟動，
    // recordAudit 會在未就緒時自動略過（best-effort）。測試環境不開連線（audit 於 test 已停用）。
    if (process.env.NODE_ENV !== 'test') {
      connectAuditMongo().catch((e) =>
        console.error('[AuditMongo] init skipped:', e?.message),
      );
    }

    // 只有非測試環境才啟動 Server
    // Supertest 會自動找空的 port 啟動 Server，所以測試環境不需要啟動
    if (process.env.NODE_ENV !== 'test') {
      const port = parseInt(process.env.PORT || '3000', 10);
      app.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
