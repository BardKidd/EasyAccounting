import { Sequelize, ModelOptions } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

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
  }
);

export const TABLE_DEFAULT_SETTING: ModelOptions = {
  schema: 'accounting',
  paranoid: true,
  timestamps: true,
  freezeTableName: true,
};

export default sequelize;
