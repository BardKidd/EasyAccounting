const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  dev: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
  },
  prd: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    dialect: 'postgres',
    schema: 'accounting',
  },
};
