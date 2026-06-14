/// <reference types="vitest" />
// 上面那個是強制 TypeScript 認識 Vitest 的東西。
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true, // 允許使用 describe, it, expect 而不用每次引入
    environment: 'node',
    // 預設排除 node_modules 和 dist
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    // Disable parallelism to prevent SequelizeDatabaseError during parallel db syncs
    fileParallelism: false,
    // 整合測試對雲端 DB 跑 beforeAll（建 user/account/匯率）時，預設 10s hook timeout
    // 在連續整合測試負載下偏緊；Phase 2 後 budget 整合 fixture 增至 4 組，雲端延遲變異
    // 偶會讓重型 beforeAll 超過 30s，故再放寬至 60s 避免偶發逾時。
    hookTimeout: 60000,
    testTimeout: 60000,
    env: {
      RESEND_API_KEY: 're_123_mock',
      AZURE_BLOB_CONNECTION_STRING:
        'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
