import cron from 'node-cron';
import User from '@/models/user';
import { Op } from 'sequelize';
import sequelize from '@/utils/postgres';

/**
 * 清理超過 30 天未活躍的訪客帳號
 */
export const runGuestCleanupJob = async () => {
  console.log('[GuestCleanupCron] Starting stale guest cleanup...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleGuests = await User.findAll({
      where: {
        isGuest: true,
        lastActivityAt: {
          [Op.lt]: thirtyDaysAgo,
        },
      },
    });

    if (staleGuests.length === 0) {
      console.log('[GuestCleanupCron] No stale guests found.');
      return;
    }

    console.log(
      `[GuestCleanupCron] Found ${staleGuests.length} stale guest(s). Deleting...`,
    );

    // 逐一刪除以觸發 afterDestroy hook (cascade)
    for (const guest of staleGuests) {
      await sequelize.transaction(async (t) => {
        await guest.destroy({ transaction: t });
      });
    }

    console.log(
      `[GuestCleanupCron] Deleted ${staleGuests.length} stale guest(s).`,
    );
  } catch (error) {
    console.error('[GuestCleanupCron] Failed:', error);
  }
};

/**
 * 每日 UTC+8 02:00 執行（避開流量尖峰）
 */
export const startGuestCleanupCronJob = () => {
  console.log('[GuestCleanupCron] Registering daily guest cleanup cron...');
  cron.schedule(
    '0 2 * * *',
    async () => {
      await runGuestCleanupJob();
    },
    { timezone: 'Asia/Taipei' },
  );
};
