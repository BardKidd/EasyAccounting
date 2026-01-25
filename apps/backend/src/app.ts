import express from 'express';
import path from 'path';
import cors from 'cors';
import { loggerMiddleware } from '@/middlewares/loggerMiddleware';

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
import budgetRoute from '@/routes/budgetRoute';
import {
  startDailyReminderCronJobs,
  startMonthlyAnalysisNoticeCronJobs,
  startWeeklySummaryNoticeCronJobs,
} from './cron/notificationCron';

const app: express.Application = express();

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
app.use('/api', budgetRoute);
app.use('/api', deployHealthRoute);

// env 沒設定預設直接通過。這樣 PRD DEV 都不用去改了。
const shouldStartCron = process.env.ENABLE_CRON !== 'false';
const shouldStartApi = process.env.ENABLE_API !== 'false';

if (shouldStartCron) {
  console.log('[App] Starting Cron Jobs...');
  startDailyReminderCronJobs();
  startWeeklySummaryNoticeCronJobs();
  startMonthlyAnalysisNoticeCronJobs();
} else {
  console.log('[App] Cron Jobs disabled for this instance.');
}

export { app };

const startServer = async () => {
  try {
    // await mongoConnection();

    // 只有非測試環境才啟動 Server
    // Supertest 會自動找空的 port 啟動 Server，所以測試環境不需要啟動
    if (process.env.NODE_ENV !== 'test') {
      if (shouldStartApi || shouldStartCron) {
        const port = parseInt(process.env.PORT || '3000', 10);
        app.listen(port, '0.0.0.0', () => {
          console.log(`Server running on port ${port}`);
        });
      }
    }
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
