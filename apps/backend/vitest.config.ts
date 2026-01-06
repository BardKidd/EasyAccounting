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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
