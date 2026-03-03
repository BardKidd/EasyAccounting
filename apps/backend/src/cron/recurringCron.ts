import cron from 'node-cron';
import { processRecurringTemplates } from '@/services/recurringTemplateService';

/**
 * 獨立函式方便測試直接呼叫，不依賴 cron scheduler。
 */
export const runRecurringTransactionJob = async () => {
  console.log('[RecurringCron] Starting recurring transaction processing...');
  try {
    await processRecurringTemplates();
    console.log('[RecurringCron] Processing completed.');
  } catch (error) {
    console.error('[RecurringCron] Failed:', error);
  }
};

/**
 * 每日 UTC+8 00:00 執行。
 * Server TZ 需設為 Asia/Taipei（或在 Dockerfile/環境變數 TZ=Asia/Taipei）。
 */
export const startRecurringTransactionCronJob = () => {
  console.log(
    '[RecurringCron] Registering daily recurring transaction cron...',
  );
  // UTC+8 00:00 = UTC 16:00 前一天，換算為 cron 即 '0 16 * * *'（視 server TZ 而定）
  // 若 server TZ 已設為 Asia/Taipei，直接用 '0 0 * * *' 即可
  cron.schedule(
    '0 0 * * *',
    async () => {
      await runRecurringTransactionJob();
    },
    { timezone: 'Asia/Taipei' },
  );
};
