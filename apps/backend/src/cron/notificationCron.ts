import emailService from '@/services/emailService';
import cron from 'node-cron';
import PersonnelNotification from '@/models/personnel_notification';
import User from '@/models/user';

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
