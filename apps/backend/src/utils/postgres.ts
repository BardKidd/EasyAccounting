import { Sequelize, ModelOptions } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
// 簡單判斷：如果不是 localhost，通常就是雲端，建議開啟 SSL。
// 或者也可以看 USER 習慣，這裡先寬鬆處理：如果是 production 必開，其他環境如果連不上會報錯，但我們可以預設為 "如果是雲端主機就開"
const isCloudHost =
  process.env.PG_HOST &&
  !process.env.PG_HOST.includes('localhost') &&
  !process.env.PG_HOST.includes('127.0.0.1');

// 安全性(#17)：預設驗證 DB TLS 憑證（防 MITM）。若雲端 provider 憑證鏈不在 Node
// 內建信任庫，可設 PG_SSL_REJECT_UNAUTHORIZED=false 暫時關閉，或提供 PG_SSL_CA（PEM）。
const sslRejectUnauthorized =
  process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false';
const sslCa = process.env.PG_SSL_CA;

const sequelize = new Sequelize(
  process.env.PG_DATABASE as string,
  process.env.PG_USER as string,
  process.env.PG_PASSWORD as string,
  {
    dialect: 'postgres',
    dialectOptions:
      isProduction || isCloudHost
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: sslRejectUnauthorized,
              ...(sslCa ? { ca: sslCa } : {}),
            },
          }
        : undefined,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    logging: false, // 測試時減少 log
    // 連線池：Neon serverless 冷連線需喚醒 compute（scale-to-zero）+ 跨區 RTT，
    // 新連線可達數秒。保留較多熱連線讓 compute 不睡、並吸收首頁並發 burst，
    // 避免多條冷連線同時喚醒導致部分請求逾時（前端 Failed to fetch）。
    // 測試環境用 min:0，避免測試結束仍有連線影響 teardown。
    // 可用 PG_POOL_MIN / PG_POOL_MAX 覆寫。
    pool: {
      max: Number(process.env.PG_POOL_MAX) || 12,
      min: isTest ? 0 : Number(process.env.PG_POOL_MIN) || 5,
      idle: 30000,
      acquire: 30000,
    },
  },
);

export const TABLE_DEFAULT_SETTING: ModelOptions = {
  schema: 'accounting',
  paranoid: true,
  timestamps: true,
  freezeTableName: true,
};

export default sequelize;
