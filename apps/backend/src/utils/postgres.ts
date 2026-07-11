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
              rejectUnauthorized: false, // 雲端(e.g. Neon/Railway) 有時需要這個
            },
          }
        : undefined,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    logging: false, // 測試時減少 log
    // 連線池：遠端 Neon 開新連線 ~1.1s，故保留熱連線避免每次請求重開。
    // 預設 min:0 + idle:10s 會在閒置 10 秒後關光連線，下次請求再吃冷連線成本。
    // 測試環境用 min:0，避免測試結束仍有連線影響 teardown。
    pool: {
      max: 10,
      min: isTest ? 0 : 2,
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
