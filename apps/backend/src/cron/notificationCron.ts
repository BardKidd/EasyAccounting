import emailService from '@/services/emailService';
import cron from 'node-cron';
import PersonnelNotification from '@/models/personnel_notification';
import User from '@/models/user';
import statisticsServices from '@/services/statisticsServices';
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { MainType } from '@repo/shared';
import { quickChartDoughnutProps } from '@/types/email';
import reportService from '@/services/reportService';

/**
 * https://crontab.guru/
 * 可參考這個網站知道內容
 */

export const startDailyReminderCronJobs = () => {
  console.log('[Cron] Start cron jobs');

  // 每天晚上 9:00 執行
  cron.schedule('00 21 * * *', async () => {
    console.log('[Cron] Starting daily reminder check...');

    try {
      // 1. 找出所有訂閱了「每日提醒」的使用者
      const subscriptions = await PersonnelNotification.findAll({
        where: { dailyReminder: true },
        include: [
          {
            model: User,
            required: true, // 有 dailyReminder 且該 User 一定要存在
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      console.log(`[Cron] Found ${subscriptions.length} users to notify.`);

      // 2. 跑迴圈去寄信
      for (const sub of subscriptions) {
        // @ts-ignore: Sequelize include type inference can be tricky
        const user = sub.user;

        if (user && user.email) {
          await emailService.sendDailyReminderEmail({
            userName: user.name,
            to: user.email,
          });
        }
      }

      console.log('[Cron] Daily reminder check completed.');
    } catch (error) {
      console.error('[Cron] Failed to execute daily reminder:', error);
    }
  });
};

export const startWeeklySummaryNoticeCronJobs = () => {
  console.log('[Cron] Start cron jobs');

  // 每週一早上 9:00 執行
  // 00 09 * * 1
  cron.schedule('55 18 * * *', async () => {
    console.log('[Cron] Starting weekly summary notice check...');
    const now = new Date();
    const weekRange = subWeeks(now, 1);
    const startDate = startOfWeek(weekRange, { weekStartsOn: 1 });
    const endDate = endOfWeek(weekRange, { weekStartsOn: 1 });

    try {
      // 1. 找出所有訂閱了「每週摘要」的使用者
      const subscriptions = await PersonnelNotification.findAll({
        where: { weeklySummaryNotice: true },
        include: [
          {
            model: User,
            required: true,
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      console.log(`[Cron] Found ${subscriptions.length} users to notify.`);

      // 2. 跑迴圈去寄信
      for (const sub of subscriptions) {
        // @ts-ignore: Sequelize include type inference can be tricky
        const user = sub.user;

        const categoryTabData = await statisticsServices.getCategoryTabData(
          {
            startDate,
            endDate,
          },
          sub.userId
        );
        let expenseSummaryData: quickChartDoughnutProps;
        let incomeSummaryData: quickChartDoughnutProps;

        if (categoryTabData.length === 0) {
          console.log(`[Cron] No data found for user ${user.name}.`);
          continue;
        }
        const expenseData = categoryTabData.filter(
          (item) => item.type === MainType.EXPENSE && item.isTransfer === false
        );
        const incomeData = categoryTabData.filter(
          (item) => item.type === MainType.INCOME && item.isTransfer === false
        );

        if (expenseData.length > 0) {
          expenseSummaryData = {
            labels: expenseData.map((item) => item.name),
            datasets: expenseData.map((item) => item.amount),
            doughnutlabel: expenseData.reduce(
              (acc, item) => acc + item.amount,
              0
            ),
          };
        } else {
          expenseSummaryData = {
            labels: [],
            datasets: [],
            doughnutlabel: 0,
          };
        }

        if (incomeData.length > 0) {
          incomeSummaryData = {
            labels: incomeData.map((item) => item.name),
            datasets: incomeData.map((item) => item.amount),
            doughnutlabel: incomeData.reduce(
              (acc, item) => acc + item.amount,
              0
            ),
          };
        } else {
          incomeSummaryData = {
            labels: [],
            datasets: [],
            doughnutlabel: 0,
          };
        }

        if (user && user.email) {
          await emailService.sendWeeklySummaryNoticeEmail({
            userName: user.name,
            to: user.email,
            startDate: format(startDate, 'yyyy/MM/dd'),
            endDate: format(endDate, 'yyyy/MM/dd'),
            expenseSummaryData,
            incomeSummaryData,
          });
        }
      }

      console.log('[Cron] Weekly summary notice check completed.');
    } catch (error) {
      console.error('[Cron] Failed to execute weekly summary notice:', error);
    }
  });
};

export const startMonthlyAnalysisNoticeCronJobs = () => {
  console.log('[Cron] Start cron jobs');

  // 每月 5 號早上 9:00 執行
  cron.schedule('00 09 5 * *', async () => {
    console.log('[Cron] Starting monthly analysis notice check...');

    try {
      // 1. 找出所有訂閱了「每月分析」的使用者
      const subscriptions = await PersonnelNotification.findAll({
        where: { monthlyAnalysisNotice: true },
        include: [
          {
            model: User,
            required: true,
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      // 2. 取出上月及上上月的交易資料

      console.log(`[Cron] Found ${subscriptions.length} users to notify.`);

      // 2. 跑迴圈去寄信
      for (const sub of subscriptions) {
        // @ts-ignore: Sequelize include type inference can be tricky
        const user = sub.user;

        const payload = await reportService.monthlyReportService({
          userName: user.name,
          userEmail: user.email,
          userId: sub.userId,
        });

        if (user && user.email) {
          await emailService.sendMonthlyAnalysisNoticeEmail({
            to: user.email,
            payload,
          });
        }
      }

      console.log('[Cron] Monthly analysis notice check completed.');
    } catch (error) {
      console.error('[Cron] Failed to execute monthly analysis notice:', error);
    }
  });
};
