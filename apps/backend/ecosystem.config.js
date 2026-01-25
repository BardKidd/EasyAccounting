module.exports = {
  apps: [
    {
      name: 'easy-accounting-api',
      script: './src/app.ts',
      cwd: __dirname,
      interpreter: 'node',
      interpreter_args: '--import tsx/esm --require tsconfig-paths/register',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        ENABLE_API: 'true',
        ENABLE_CRON: 'false',
        PORT: 3000,
      },
    },
    {
      name: 'easy-accounting-cron',
      script: './src/app.ts',
      cwd: __dirname,
      interpreter: 'node',
      interpreter_args: '--import tsx/esm --require tsconfig-paths/register',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env: {
        ENABLE_API: 'false',
        ENABLE_CRON: 'true',
      },
    },
  ],
};
