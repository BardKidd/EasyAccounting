import { Page, Locator } from '@playwright/test';
import path from 'path';

/**
 * 教學影片共用 helper — 對照 docs/specs/tutorial-video-spec.md（V6/V7/V8）。
 *
 * 提供四項硬性需求（R1–R4）的統一實作，各影片 spec 只用本檔對外 API：
 *   - installDemoOverlay  注入：底部字幕 + 頂部章節標題列 + 紅圈游標 + 漣漪（R1/R2/R3）
 *   - narrate / chapter   字幕與章節
 *   - moveTo / click / type  帶游標平滑移動 + 漣漪的互動（R1/R2/R4）
 *   - guestLogin          訪客登入（每段自給自足的入口，V9）
 *   - saveVideo           afterEach 收尾，把錄影存成具名 WebM 給 ffmpeg 轉檔（§5.6）
 *
 * 速度（R4/V8）：游標 page.mouse.move steps=24、逐字輸入 delay=60ms、字幕 holdMs，
 * 另外 launchOptions.slowMo=250ms 由 playwright.video.config.ts 統一設定。
 */

export const API = 'http://localhost:3000/api';

/** 今天日期 yyyy-mm-dd（種子交易用） */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// ─── 浮層注入（字幕 + 章節列 + 紅圈游標 + 漣漪）────────────────────────────
/**
 * 在第一個 page.goto 前呼叫。透過 addInitScript 於每個 document 載入時重建浮層；
 * SPA 路由切換不重載故持續存在，完整頁面導航則自動重建。
 */
export async function installDemoOverlay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const FONT =
      'system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif';

    // 底部字幕（沿用既有 e2e demo 的樣式）
    function narratorBar(): HTMLElement {
      const ID = '__e2e_narrator__';
      let bar = document.getElementById(ID);
      if (bar) return bar;
      bar = document.createElement('div');
      bar.id = ID;
      bar.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:28px',
        'transform:translateX(-50%)',
        'max-width:82%',
        'padding:14px 30px',
        'background:rgba(15,23,42,0.94)',
        'color:#f8fafc',
        'font-size:21px',
        'font-weight:600',
        'line-height:1.55',
        'letter-spacing:0.3px',
        'border-radius:16px',
        'z-index:2147483647',
        'pointer-events:none',
        'box-shadow:0 10px 40px rgba(0,0,0,0.45)',
        'border:1px solid rgba(16,185,129,0.45)',
        `font-family:${FONT}`,
        'text-align:center',
        'white-space:pre-wrap',
      ].join(';');
      (document.body || document.documentElement).appendChild(bar);
      return bar;
    }

    // 頂部章節標題列：顯示「功能名 · 步驟 n/N」
    function chapterBar(): HTMLElement {
      const ID = '__e2e_chapter__';
      let bar = document.getElementById(ID);
      if (bar) return bar;
      bar = document.createElement('div');
      bar.id = ID;
      bar.style.cssText = [
        'position:fixed',
        'left:50%',
        'top:18px',
        'transform:translateX(-50%)',
        'padding:8px 22px',
        'background:rgba(16,185,129,0.95)',
        'color:#06281d',
        'font-size:16px',
        'font-weight:700',
        'letter-spacing:0.4px',
        'border-radius:9999px',
        'z-index:2147483647',
        'pointer-events:none',
        'box-shadow:0 6px 24px rgba(0,0,0,0.30)',
        `font-family:${FONT}`,
        'white-space:nowrap',
        'opacity:0',
        'transition:opacity .25s ease',
      ].join(';');
      (document.body || document.documentElement).appendChild(bar);
      return bar;
    }

    // 紅圈游標：跟隨真實指標移動（R2）
    function cursorRing(): HTMLElement {
      const ID = '__e2e_cursor__';
      let ring = document.getElementById(ID);
      if (ring) return ring;
      ring = document.createElement('div');
      ring.id = ID;
      ring.style.cssText = [
        'position:fixed',
        'left:-100px',
        'top:-100px',
        'width:28px',
        'height:28px',
        'border:3px solid #ef4444',
        'border-radius:50%',
        'background:rgba(239,68,68,0.12)',
        'box-shadow:0 0 0 4px rgba(239,68,68,0.22),0 0 14px 2px rgba(239,68,68,0.55)',
        'transform:translate(-50%,-50%)',
        'pointer-events:none',
        'z-index:2147483646',
        'transition:left .08s linear,top .08s linear',
      ].join(';');
      (document.body || document.documentElement).appendChild(ring);
      document.addEventListener(
        'mousemove',
        (e) => {
          ring!.style.left = e.clientX + 'px';
          ring!.style.top = e.clientY + 'px';
        },
        true,
      );
      return ring;
    }

    function init() {
      narratorBar();
      chapterBar();
      cursorRing();
    }

    (window as any).__narrate = (text: string) => {
      narratorBar().textContent = text;
    };
    (window as any).__chapter = (title: string) => {
      const bar = chapterBar();
      bar.textContent = title;
      bar.style.opacity = title ? '1' : '0';
    };
    // 漣漪（R1）：在 (x,y) 由小擴散並淡出後移除
    (window as any).__ripple = (x: number, y: number) => {
      const r = document.createElement('div');
      r.style.cssText = [
        'position:fixed',
        `left:${x}px`,
        `top:${y}px`,
        'width:14px',
        'height:14px',
        'border:2px solid rgba(239,68,68,0.9)',
        'border-radius:50%',
        'transform:translate(-50%,-50%) scale(1)',
        'pointer-events:none',
        'z-index:2147483647',
        'opacity:0.9',
        'transition:transform .6s ease-out,opacity .6s ease-out',
      ].join(';');
      (document.body || document.documentElement).appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = 'translate(-50%,-50%) scale(6)';
        r.style.opacity = '0';
      });
      setTimeout(() => r.remove(), 650);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
}

// ─── 字幕 / 章節 ───────────────────────────────────────────────────────────
/** 設定底部字幕並停留 holdMs（R3 + 速度感 R4） */
export async function narrate(page: Page, text: string, holdMs = 2000): Promise<void> {
  await page.evaluate((t) => (window as any).__narrate?.(t), text);
  await page.waitForTimeout(holdMs);
}

/** 設定頂部章節標題「功能名 · 步驟 n/N」 */
export async function chapter(
  page: Page,
  title: string,
  step: number,
  total: number,
): Promise<void> {
  const label = `${title} · 步驟 ${step}/${total}`;
  await page.evaluate((t) => (window as any).__chapter?.(t), label);
}

// ─── 帶游標 + 漣漪的互動（R1/R2/R4）────────────────────────────────────────
/** 把紅圈平滑移到 locator 中心（不點擊），回傳座標 */
export async function moveTo(
  page: Page,
  target: Locator,
): Promise<{ x: number; y: number } | null> {
  await target.scrollIntoViewIfNeeded().catch(() => {});
  // 容忍裝飾性移動找不到元素（回 null 即略過）；真正的點擊仍由 click() 的 target.click() 嚴格把關
  const box = await target.boundingBox({ timeout: 4000 }).catch(() => null);
  if (!box) return null;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 24 }); // 平滑滑過去，紅圈跟著走
  return { x, y };
}

/** 移到目標 → 觸發漣漪 → 真正點擊（R1+R2 核心） */
export async function click(page: Page, target: Locator): Promise<void> {
  const pt = await moveTo(page, target);
  if (pt) {
    await page.evaluate(({ x, y }) => (window as any).__ripple?.(x, y), pt);
    await page.waitForTimeout(180); // 讓漣漪可見再點下去
  }
  await target.click();
}

/** 移到欄位 → 點擊聚焦 → 逐字輸入（可見打字、慢速 R4） */
export async function type(page: Page, target: Locator, text: string): Promise<void> {
  await click(page, target);
  await target.fill('');
  await target.pressSequentially(text, { delay: 60 });
}

// ─── 訪客登入（每段自給自足的入口，V9）────────────────────────────────────
/** 點「免註冊試用」進 guest，含既有 demo 的 4 次重試穩健 loop */
export async function guestLogin(page: Page): Promise<void> {
  const guestBtn = page.getByRole('button', { name: '免註冊試用' });
  await guestBtn.waitFor({ state: 'visible' });
  for (let i = 0; i < 4; i++) {
    await guestBtn.click().catch(() => {});
    try {
      await page.waitForURL('**/dashboard', { timeout: 25_000 });
      break;
    } catch {
      if (page.url().includes('/dashboard')) break;
      await page.waitForTimeout(1500);
    }
  }
}

// ─── 一般帳號登入（測試帳號；guest /settings 無法渲染時的備援）─────────────
/** 用 .env 的 TEST_USER_EMAIL/PASSWORD 登入。需在 /login 頁呼叫。 */
export async function login(page: Page): Promise<void> {
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: '登入' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30_000 }).catch(() => {});
}

// ─── 收尾：把錄影存成具名 WebM（§5.6，給 ffmpeg 轉檔）──────────────────────
/** 在 test.afterEach 呼叫；關閉 page 觸發錄影 flush 後存到 e2e/videos/.raw/<slug>.webm */
export async function saveVideo(page: Page, slug: string): Promise<void> {
  const video = page.video();
  if (!video) return;
  await page.close(); // 觸發錄影完成寫檔
  const dest = path.resolve(__dirname, '..', '.raw', `${slug}.webm`);
  await video.saveAs(dest).catch(() => {});
}
