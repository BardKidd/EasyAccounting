import cron from 'node-cron';
import { fetchAllActiveRates } from '@/services/exchangeRateService';

/**
 * 獨立函式方便測試直接呼叫，不依賴 cron scheduler。
 * 抓取所有 active 幣別兩兩匯率（source='API'）。
 */
export const runExchangeRateJob = async () => {
  console.log('[ExchangeRateCron] Fetching latest exchange rates...');
  try {
    const written = await fetchAllActiveRates();
    console.log(`[ExchangeRateCron] Done. ${written} rates upserted.`);
  } catch (error) {
    console.error('[ExchangeRateCron] Failed:', error);
  }
};

/**
 * 每日 06:00（Asia/Taipei）抓匯率。
 * NODE_ENV=test 或 EXCHANGE_RATE_API_DISABLED=true 時跳過註冊（沿用 cron 慣例）。
 */
export const startExchangeRateCronJob = () => {
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.EXCHANGE_RATE_API_DISABLED === 'true'
  ) {
    console.log('[ExchangeRateCron] Skipped (test env or disabled).');
    return;
  }
  console.log('[ExchangeRateCron] Registering daily exchange rate cron...');
  cron.schedule(
    '0 6 * * *',
    async () => {
      await runExchangeRateJob();
    },
    { timezone: 'Asia/Taipei' },
  );
};
