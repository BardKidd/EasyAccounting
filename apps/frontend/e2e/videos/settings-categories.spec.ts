import { test, expect, Locator } from '@playwright/test';
import {
  installDemoOverlay,
  narrate,
  chapter,
  click,
  type,
  login,
  saveVideo,
} from './support/demo';

/**
 * 教學影片 — 設定 · 分類管理。照 transactions-tags.spec.ts 的結構與風格寫。
 *
 * 流程：① 新增主分類（支出「保險」）② 在「保險」下新增子分類「醫療險」
 *       ③ 編輯「醫療險」→「住院醫療險」④ 刪除該子分類。
 *
 * ⚠️ 風險（與 e2e/tags-demo.spec.ts 同一備註）：guest 帳號的 /settings 頁有與分類
 *    無關的既有 SSR 相依（需通知設定列），可能無法正常渲染／整頁失敗。本檔仍以
 *    login(page) 撰寫以與其他影片段落一致；主流程錄製時若發現 guest /settings
 *    載不出來，請改用測試帳號登入：
 *      goto('/login')
 *      page.getByPlaceholder('name@example.com').fill(process.env.TEST_USER_EMAIL)
 *      page.getByPlaceholder('••••••••').fill(process.env.TEST_USER_PASSWORD)
 *      click(page, page.getByRole('button', { name: '登入' }))
 *    再從下方 goto('/settings') 起接續。
 *
 * selector 備註：
 *  - 「分類管理」是 /settings 的預設 tab（Tabs defaultValue="categories"），仍防禦性點一下。
 *  - 兩張卡（支出/收入）各有一顆「新增分類」按鈕，需用卡片標題（支出分類/收入分類）scope。
 *  - 分類樹節點上的「新增子分類/編輯/刪除」是 hover 才浮現的「純 icon」按鈕，
 *    沒有 aria-label/title/文字，只能靠 lucide 的 svg class 定位
 *    （plus → svg.lucide-plus、pencil → svg.lucide-pencil、trash2 → svg.lucide-trash-2）；
 *    且編輯/刪除只在「自定義分類（有 userId）」才出現——剛新增的「保險/醫療險」即屬之。
 *  - CategoryDialog：名稱欄 placeholder「例如: 餐飲, 交通...」；送出鈕新增=「新增」、編輯=「更新」。
 *  - DeleteConfirmDialog：確認鈕文字為「刪除」。
 */

const SLUG = 'settings-categories';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterEach(async ({ page }) => {
  await saveVideo(page, SLUG);
});

test('分類管理：新增主分類 → 新增子分類 → 編輯 → 刪除', async ({ page }) => {
  await installDemoOverlay(page);

  // ── 片頭 ──
  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await chapter(page, '設定 · 分類管理', 1, 5);
  await narrate(
    page,
    '🎬 分類管理\n新增主分類 → 新增子分類 → 編輯 → 刪除，打造你的收支類別結構',
    3000,
  );
  await login(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  // ── 進入設定 → 分類管理 tab ──
  await page.goto('/settings');
  await page.waitForLoadState('networkidle').catch(() => {});
  // 「分類管理」是預設 tab，仍防禦性點選確保聚焦
  await click(page, page.getByRole('tab', { name: '分類管理' }));

  // 支出分類卡（用卡片標題 scope 出該張卡，再取其中的「新增分類」鈕）
  const expenseCard = page
    .locator('div', { has: page.getByText('支出分類', { exact: true }) })
    .filter({ has: page.getByRole('button', { name: '新增分類' }) })
    .first();
  const dialog = page.getByRole('dialog');

  // 在「支出分類」這張卡的分類樹中，依名稱取得節點列（含 hover 浮現的 icon 操作鈕）
  const rowInExpense = (name: string): Locator =>
    expenseCard
      .locator('div.group.relative')
      .filter({ has: page.getByText(name, { exact: true }) })
      .first();

  // ── ① 新增主分類（支出「保險」）──
  await chapter(page, '設定 · 分類管理', 2, 5);
  await narrate(page, '① 在「支出分類」卡點「新增分類」，建立一個主分類', 2400);
  // 支出卡在 DOM 中排第一，直接取第一顆「新增分類」即為支出卡的（避免外層 div 同時含兩張卡）
  await click(page, page.getByRole('button', { name: '新增分類' }).first());
  await expect(dialog.getByText('新增主分類')).toBeVisible();
  await narrate(page, '在對話框輸入分類名稱「保險」，送出新增', 2200);
  await type(page, dialog.getByPlaceholder('例如: 餐飲, 交通...'), '保險');
  await click(page, dialog.getByRole('button', { name: '新增' }));
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(expenseCard.getByText('保險', { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await narrate(page, '主分類「保險」已加入支出分類樹', 1800);

  // ── ② 在「保險」下新增子分類「醫療險」──
  await chapter(page, '設定 · 分類管理', 3, 5);
  await narrate(
    page,
    '② 滑到「保險」節點，點 ＋ 為它新增一個子分類',
    2400,
  );
  const insuranceRow = rowInExpense('保險');
  // 主分類才有的「新增子分類」鈕（lucide plus icon），hover 浮現
  await click(page, insuranceRow.locator('button:has(svg.lucide-plus)').first());
  await expect(dialog.getByText(/的子分類/)).toBeVisible();
  await narrate(page, '輸入子分類名稱「醫療險」並送出', 2200);
  await type(page, dialog.getByPlaceholder('例如: 餐飲, 交通...'), '醫療險');
  await click(page, dialog.getByRole('button', { name: '新增' }));
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  // 父節點「保險」展開後才看得到子分類，點一下展開
  await click(page, insuranceRow);
  await expect(expenseCard.getByText('醫療險', { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await narrate(page, '子分類「醫療險」已掛在「保險」之下', 1800);

  // ── ③ 編輯子分類：醫療險 → 住院醫療險 ──
  await chapter(page, '設定 · 分類管理', 4, 5);
  await narrate(
    page,
    '③ 滑到「醫療險」，點鉛筆圖示編輯，改名為「住院醫療險」',
    2600,
  );
  const medicalRow = rowInExpense('醫療險');
  // 自定義分類（有 userId）才有的「編輯」鈕（lucide pencil icon）
  await click(page, medicalRow.locator('button:has(svg.lucide-pencil)').first());
  await expect(dialog.getByText('編輯分類')).toBeVisible();
  await type(page, dialog.getByPlaceholder('例如: 餐飲, 交通...'), '住院醫療險');
  await click(page, dialog.getByRole('button', { name: '更新' }));
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(expenseCard.getByText('住院醫療險', { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await narrate(page, '已更新為「住院醫療險」', 1800);

  // ── ④ 刪除子分類：住院醫療險 ──
  await chapter(page, '設定 · 分類管理', 5, 5);
  await narrate(
    page,
    '④ 滑到「住院醫療險」，點垃圾桶圖示，於確認對話框按「刪除」',
    2600,
  );
  const renamedRow = rowInExpense('住院醫療險');
  // 自定義分類才有的「刪除」鈕（lucide trash-2 icon）
  await click(
    page,
    renamedRow.locator('button:has(svg.lucide-trash-2)').first(),
  );
  const alert = page.getByRole('alertdialog');
  await expect(alert.getByText('確認刪除？')).toBeVisible();
  await click(page, alert.getByRole('button', { name: '刪除' }));
  await expect(
    expenseCard.getByText('住院醫療險', { exact: true }),
  ).toHaveCount(0, { timeout: 10_000 });

  await narrate(
    page,
    '✅ 分類管理示範完成：新增主分類 / 新增子分類 / 編輯 / 刪除',
    3400,
  );
});
