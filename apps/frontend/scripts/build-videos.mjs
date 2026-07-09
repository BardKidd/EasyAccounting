#!/usr/bin/env node
/**
 * WebM → MP4 轉檔 — 對照 docs/specs/tutorial-video-spec.md（§5.6 / R5）。
 *
 * 掃 apps/frontend/e2e/videos/.raw/*.webm，逐一用 ffmpeg 轉成 H.264 mp4，
 * 輸出到 repo 根目錄的 docs/videos/<slug>.mp4。
 *
 * 用法：
 *   pnpm video:build                # 轉全部
 *   pnpm video:build transactions-tags   # 只轉指定 slug
 *
 * 前置：brew install ffmpeg
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.resolve(__dirname, '../e2e/videos/.raw');
const OUT_DIR = path.resolve(__dirname, '../../../docs/videos');

function ensureFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error('✗ 找不到 ffmpeg。請先安裝：brew install ffmpeg');
    process.exit(1);
  }
}

function main() {
  ensureFfmpeg();

  if (!existsSync(RAW_DIR)) {
    console.error(`✗ 尚無原始錄影目錄：${RAW_DIR}\n  請先執行 pnpm video:record`);
    process.exit(1);
  }

  const filter = process.argv[2]; // 可選 slug 過濾
  const webms = readdirSync(RAW_DIR)
    .filter((f) => f.endsWith('.webm'))
    .filter((f) => !filter || f === `${filter}.webm`);

  if (webms.length === 0) {
    console.error(
      filter
        ? `✗ 找不到 ${filter}.webm（在 ${RAW_DIR}）`
        : `✗ ${RAW_DIR} 內沒有任何 .webm`,
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  for (const webm of webms) {
    const slug = webm.replace(/\.webm$/, '');
    const src = path.join(RAW_DIR, webm);
    const dest = path.join(OUT_DIR, `${slug}.mp4`);
    console.log(`▶ 轉檔 ${slug} …`);
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i', src,
        '-vf', 'fps=30,format=yuv420p',
        '-c:v', 'libx264',
        '-crf', '20',
        '-preset', 'slow',
        '-movflags', '+faststart',
        dest,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
    console.log(`  ✓ ${path.relative(process.cwd(), dest)}`);
  }

  console.log(`\n完成：${webms.length} 支 → ${path.relative(process.cwd(), OUT_DIR)}/`);
}

main();
