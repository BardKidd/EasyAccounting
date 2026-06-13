import express from 'express';
import path from 'path';
import cors from 'cors';
import { loggerMiddleware } from '@/middlewares/loggerMiddleware';
import mongoConnection from '@/utils/mongodb';

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

// CORS 設定
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigin = process.env.ORIGIN_URL;

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigin && origin === allowedOrigin) {
        callback(null, true);
      } else {
        console.log(
          `[CORS BLOCK] Origin: '${origin}', Allowed: '${allowedOrigin}'`,
        );
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
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
