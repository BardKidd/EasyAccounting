const dotenv = require('dotenv');
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isCloudHost =
  process.env.PG_HOST &&
  !process.env.PG_HOST.includes('localhost') &&
  !process.env.PG_HOST.includes('127.0.0.1');

// SSL 策略：
// 1. Production 環境：強制開啟
// 2. 雲端主機 (Host 不是 localhost)：強制開啟
// 3. 其他：關閉
const useSSL = isProduction || isCloudHost;

const dialectOptions = useSSL
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false, // 雲端(e.g. Neon/Railway) 有時需要這個
      },
    }
  : undefined;

module.exports = {
  // 本地開發
  development: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
    dialectOptions: dialectOptions,
  },
  // CI 環境
  test: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
    // CI 通常是在 Container 內跑，Host 如果是 localhost 就不開 SSL
    // 如果 CI 連接的是雲端 DB，則依照 Host 自動開啟
    dialectOptions: dialectOptions,
  },
  // 生產環境
  production: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
    dialectOptions: dialectOptions,
  },
};
