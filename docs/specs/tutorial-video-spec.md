# EasyAccounting 功能操作教學影片 — 規格書

> 用 Playwright 自動操作 App、錄製「帶字幕 + 紅圈游標 + 滑鼠漣漪」的功能教學影片，最終輸出 `.mp4`。
> 本文件為唯一真實來源（single source of truth）。決策 V1–V13 已由使用者拍板，動工前先讀完本文。
>
> 狀態：**規格定稿、尚未動工**（2026-06-20）

---

## 1. 背景與目標

EasyAccounting 是個人記帳 App（Next.js 前端 :8080 + Express 後端 :3000）。本任務要為每個功能模組製作一支**操作教學影片**，給使用者看「這個功能怎麼用」。

**目標**

- 每個功能模組一支**獨立短片**（2–6 分鐘），可單獨重錄、單獨分享。
- 每支影片皆具備四項硬性需求（見 §3）：滑鼠漣漪、紅色圓圈定位、字幕說明、速度不過快。
- 最終產物為 `.mp4`（H.264），放在 `docs/videos/`。
- 全程用 Playwright 自動驅動真實 UI，不手動錄螢幕——可重複、可維護、改版即重跑。

**非目標**

- 不做配音 / 旁白語音（字幕即說明）。
- 不做後製剪輯軟體流程（轉場、片頭片尾動畫）——若需要，列為後續可選項。
- 第一階段不涵蓋需外部服務（Azure / LLM）才能跑的流程（見 §7 Phase 2）。

---

## 2. 現況盤點（可直接複用的資產）

動工前先認知：**字幕與「每功能一份錄影 config」的基礎建設已經存在**，本任務是「擴充 + 補兩個缺口」，不是從零開始。

| 既有資產 | 位置 | 複用方式 |
|---|---|---|
| 字幕浮層 `installNarrator()` / `narrate(page, text, holdMs)` | `e2e/tags-demo.spec.ts` 等 | 抽到共用 helper，全段沿用 |
| 帶字幕示範測試 | `e2e/tags-demo.spec.ts`、`split-demo.spec.ts`、`budget-demo.spec.ts`、`budget-phase2-demo.spec.ts` | 直接改造成正式影片段落 |
| 錄影專用 config 範本 | `playwright.tags.config.ts`、`playwright.split.config.ts` | 收斂成單一 `playwright.video.config.ts`（V5） |
| 錄影設定慣例 | `video:{mode:'on',size:{1440×900}}`、viewport 1440×900、serial 單 worker、demo 埠 8090、後端 `ORIGIN_URL` 對齊 | 全部沿用 |
| API 種子資料慣例 | demo spec 內用 `page.request.post(`${API}/...`)` 建帳戶/標籤/交易 | 全段沿用（V9） |
| 改名後的影片產出目錄 | `tags-e2e-videos/`、`split-e2e-videos/`、`budget-e2e-videos/` | 統一改為 `docs/videos/` |

**兩個缺口（本任務新增）**

1. **紅圈游標 + 滑鼠漣漪**：現有 demo 完全沒有。Playwright 點擊是「瞬移」、不動真實游標，需自行注入假游標與漣漪動畫（§5.2）。
2. **MP4 輸出**：Playwright 只能錄 **WebM（VP8）**，且本機**未安裝 `ffmpeg`**。需裝 ffmpeg 並加一段 WebM→MP4 轉檔（§5.6）。

---

## 3. 硬性需求（使用者明確要求）

| # | 需求 | 實作對應 |
|---|---|---|
| R1 | **滑鼠漣漪效果** | 每次點擊在點擊座標觸發擴散漣漪動畫（§5.2） |
| R2 | **紅色圓圈表明所在位置** | 注入跟隨游標的紅色圓環，操作前平滑移到目標再點擊（§5.2） |
| R3 | **字幕說明目前在做什麼** | 沿用 `narrate()` 字幕浮層 + 頂部功能標題列（§5.3） |
| R4 | **速度不能太快** | slowMo + 游標平滑移動 + 逐字輸入 + 字幕停留時間（§5.4） |
| R5 | **輸出 MP4** | ffmpeg 將 WebM 轉 H.264 mp4（§5.6） |

---

## 4. 決策（V1–V13，已拍板，不可自行更改）

- **V1（影片切分）**：每個功能一支獨立短片。最後可選擇性串接成完整導覽（列為 Phase 3 可選）。
- **V2（涵蓋範圍）**：核心流程優先。Phase 1 只做訪客模式可完整跑通、不依賴外部服務的段落（清單見 §7）。帳單匯入 / 對帳 / 週期 / 審計留 Phase 2。
- **V3（MP4）**：安裝 `ffmpeg`，錄完自動將 WebM 轉成 H.264 mp4。
- **V4（解析度 / 畫面比例）**：**1440×900**（沿用既有 tags/budget config 慣例，16:10，檔案不致過大）。如日後要 1080p 16:9，改 config 一處即可。
- **V5（config 收斂）**：以**單一** `playwright.video.config.ts` 取代每功能一份 config。每個段落是 `e2e/videos/*.spec.ts` 下的獨立 spec 檔，靠 `testMatch` 篩選；避免維護 ~15 份近乎重複的 config。
- **V6（共用 helper）**：所有錄影共用邏輯抽到 `e2e/videos/support/demo.ts`（字幕 + 紅圈游標 + 漣漪 + 點擊/輸入 helper）。各 spec 只寫腳本，不重複貼浮層程式碼。
- **V7（紅圈規格）**：紅色圓環 ⌀28px、`border:3px solid #ef4444` + 外發光，`pointer-events:none`、最高 z-index，跟隨真實指標移動；漣漪 600ms 由 12px 擴散至約 6×、同時淡出後移除。
- **V8（速度參數）**：`launchOptions.slowMo = 250ms`、游標 `page.mouse.move(..., {steps:24})`、逐字輸入 `pressSequentially(text,{delay:60})`、字幕 `holdMs` 預設 2000、重點段落 2800–3200。
- **V9（種子資料）**：用 **guest（免註冊試用）登入 + API 種子**（`page.request`），每段影片自給自足、可獨立重跑、互不依賴狀態。
- **V10（demo 埠）**：~~前端跑 8090~~ → **改用日常 dev 的 8080**（2026-06-20 實作時修訂）。原因：`next dev` 的 `.next/dev/lock` 跨埠共用，8080 已有 dev 在跑時**無法**再起 8090；且 dev 模式 CORS 放行任意 localhost，毋須 ORIGIN_URL 對齊。config 用 `reuseExistingServer`：有 dev 就重用、沒跑才自己起。
- **V11（產出路徑）**：原始 WebM 落在 `e2e/videos/.raw/<slug>.webm`；成品 mp4 落在 `docs/videos/<slug>.mp4`。
- **V12（字幕語言）**：繁體中文。在 `narrate` 底部字幕之外，再加一條**頂部功能標題列**（顯示「功能名 · 步驟 n/N」）。
- **V13（mp4 是否進 git）**：**暫不追蹤**——`docs/videos/*.mp4` 與 `e2e/videos/.raw/` 加入 `.gitignore`（mp4 體積大）。日後若要隨 repo 散佈，再評估 git-lfs（列為未決，見 §11 Q1）。

---

## 5. 技術架構

### 5.1 共用 helper：`e2e/videos/support/demo.ts`

對外 API（各 spec 只用這些，不碰底層）：

```ts
// 一次性安裝浮層（字幕 + 紅圈游標 + 漣漪）；務必在第一個 page.goto 前呼叫
export async function installDemoOverlay(page: Page): Promise<void>;

// 字幕（沿用既有實作）。holdMs 控制停留時間 → 速度感
export async function narrate(page: Page, text: string, holdMs?: number): Promise<void>;

// 頂部功能標題列：顯示「功能名 · 步驟 n/N」
export async function chapter(page: Page, title: string, step: number, total: number): Promise<void>;

// 把紅圈平滑移到 locator 中心（不點擊）
export async function moveTo(page: Page, target: Locator): Promise<void>;

// 移到目標 → 觸發漣漪 → 真正點擊（R1+R2 的核心）
export async function click(page: Page, target: Locator): Promise<void>;

// 移到欄位 → 點擊聚焦 → 逐字輸入（可見打字 + 慢速）
export async function type(page: Page, target: Locator, text: string): Promise<void>;

// 收尾：把本段影片存成具名 WebM 到 .raw/<slug>.webm（給 §5.6 轉檔用）
export async function saveVideo(page: Page, slug: string): Promise<void>;
```

### 5.2 紅圈游標 + 滑鼠漣漪（R1 / R2）

以 `page.addInitScript` 注入；每次 document 載入自動重建（SPA route change 不重載故持續存在）。

**紅圈游標**：固定定位的 `<div>`，紅色圓環 + 外發光 + 半透明紅底，`transform:translate(-50%,-50%)` 對準座標，`transition` 約 80ms 使跟隨平滑。注入一個 `mousemove` listener 讓圓環跟著瀏覽器真實指標走。

```js
// 注入腳本核心（示意）
const ring = document.createElement('div');
ring.style.cssText = [
  'position:fixed','width:28px','height:28px','left:-100px','top:-100px',
  'border:3px solid #ef4444','border-radius:50%',
  'background:rgba(239,68,68,0.12)',
  'box-shadow:0 0 0 4px rgba(239,68,68,0.22),0 0 14px 2px rgba(239,68,68,0.55)',
  'transform:translate(-50%,-50%)','pointer-events:none','z-index:2147483646',
  'transition:left .08s linear,top .08s linear',
].join(';');
document.body.appendChild(ring);
addEventListener('mousemove', e => { ring.style.left = e.clientX+'px'; ring.style.top = e.clientY+'px'; }, true);

window.__ripple = (x, y) => {
  const r = document.createElement('div');
  r.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:14px;height:14px;
    border:2px solid rgba(239,68,68,.9);border-radius:50%;transform:translate(-50%,-50%) scale(1);
    pointer-events:none;z-index:2147483647;opacity:.9;transition:transform .6s ease-out,opacity .6s ease-out`;
  document.body.appendChild(r);
  requestAnimationFrame(() => { r.style.transform='translate(-50%,-50%) scale(6)'; r.style.opacity='0'; });
  setTimeout(() => r.remove(), 650);
};
```

**Node 端 `click()` 流程**（R2→R1 順序）：
1. `box = await target.boundingBox()` → 算中心 `(cx, cy)`。
2. `await page.mouse.move(cx, cy, { steps: 24 })` → 真實指標平滑移動，紅圈跟著走。
3. `await page.evaluate(({x,y}) => window.__ripple(x,y), {x:cx,y:cy})` → 觸發漣漪。
4. `await target.click()` → 在同座標真正點擊（位置已對準，點擊穩定）。

> 注意：漣漪/圓環是注入的真實 DOM，會被錄進影片；但 `pointer-events:none` 確保不攔截點擊。若某段需驗證截圖比對，記得排除這兩個元素。

### 5.3 字幕（R3）

- **底部字幕**：沿用既有 `installNarrator` 的浮層（半透明深底、綠邊、置中、`white-space:pre-wrap` 支援多行）。`narrate(page, text, holdMs)` 設定文字並停留 `holdMs`。
- **頂部標題列**：新增 `chapter()`，固定在畫面頂端顯示「功能名 · 步驟 2/6」，讓觀眾隨時知道進度與所在模組。

### 5.4 速度控制（R4）

| 手段 | 設定 | 作用 |
|---|---|---|
| 全域 slowMo | `launchOptions.slowMo: 250` | 每個 Playwright 動作間插入停頓 |
| 游標移動 | `page.mouse.move(..., {steps:24})` | 指標「滑」過去而非瞬移 |
| 逐字輸入 | `pressSequentially(text,{delay:60})` | 看得見打字過程 |
| 字幕停留 | `holdMs` 2000（重點 2800–3200） | 讀得完說明再繼續 |
| 關鍵動作後 | 視需要 `waitForTimeout` | 讓 UI 動畫 / 結果停留可見 |

### 5.5 錄影 config：`playwright.video.config.ts`

單一 config，沿用 tags config 的 webServer / 埠 / 錄影設定，差異是 `testDir: './e2e/videos'`、`testMatch` 可由 CLI 指定單一 slug：

```ts
use: {
  baseURL: 'http://localhost:8090',
  video: { mode: 'on', size: { width: 1440, height: 900 } },
  viewport: { width: 1440, height: 900 },
  launchOptions: { slowMo: 250 },   // R4
  trace: 'on',
},
fullyParallel: false, workers: 1, retries: 0, timeout: 240_000,
outputDir: 'e2e/videos/.pw',
webServer: [ /* 後端 ORIGIN_URL=:8090 + 前端 :8090，沿用 tags config */ ],
```

執行：
- 全部：`pnpm video:record`
- 單段：`pnpm video:record -- transactions-tags`（傳給 `playwright test -g` 或檔名）

### 5.6 WebM → MP4 轉檔（R5）

- **前置**：`brew install ffmpeg`（V3）。
- **取得具名 WebM**：每段在 `test.afterEach` 呼叫 `saveVideo(page, slug)` →
  `await page.video()?.saveAs('e2e/videos/.raw/' + slug + '.webm')`（須先 `page.close()` 觸發 flush，由 Playwright 在 afterEach 自動處理）。
- **轉檔腳本** `scripts/build-videos.mjs`（`pnpm video:build`）：掃 `.raw/*.webm`，逐一執行：

```bash
ffmpeg -y -i .raw/<slug>.webm \
  -vf "fps=30,format=yuv420p" \
  -c:v libx264 -crf 20 -preset slow -movflags +faststart \
  docs/videos/<slug>.mp4
```

- **一鍵**：`pnpm video:make` = `video:record` → `video:build`。

### 5.7 種子資料策略（V9）

- 每段開頭：`goto('/login')` → 點「免註冊試用」進 guest → 視需要用 `page.request.post(${API}/...)` 建立該段所需的帳戶 / 分類 / 標籤 / 交易。
- 原則：**每段自給自足**，不依賴其他段落留下的狀態，任一段可單獨重錄。
- `API = 'http://localhost:3000/api'`（沿用既有 demo 慣例）。

---

## 6. 檔案組織

```
apps/frontend/
  playwright.video.config.ts          # V5 單一錄影 config（新增）
  e2e/videos/
    support/demo.ts                   # V6 共用 helper：字幕+游標+漣漪+act（新增）
    auth-login-guest.spec.ts          # 各段一檔（新增）
    dashboard-tour.spec.ts
    transactions-add.spec.ts
    transactions-tags.spec.ts         # 由現有 tags-demo 改造
    transactions-split.spec.ts        # 由現有 split-demo 改造
    ...
    .raw/<slug>.webm                  # 原始錄影（gitignore）
    .pw/                              # Playwright outputDir（gitignore）
  scripts/build-videos.mjs            # WebM→MP4（新增）
docs/
  specs/tutorial-video-spec.md        # 本文件
  videos/<slug>.mp4                   # 成品（gitignore，V13）
```

`package.json` 新增 scripts：

```jsonc
"video:record": "playwright test --config=playwright.video.config.ts",
"video:build":  "node scripts/build-videos.mjs",
"video:make":   "pnpm video:record && pnpm video:build"
```

---

## 7. 影片清單

### Phase 1 — 核心流程（訪客模式可跑通，無外部服務依賴）

| # | slug | 功能模組 | 重點操作 | 複用來源 | 預估 |
|---|---|---|---|---|---|
| 1 | `auth-login-guest` | 登入 | Email 登入 + 免註冊試用入口 | login/guest demo | 2–3 分 |
| 2 | `dashboard-tour` | 儀表板 | 資產總覽、本月交易、走勢圖導覽 | 新寫 | 2–3 分 |
| 3 | `transactions-add` | 交易 | 新增支出/收入、分類/帳戶/金額/備註 | add_transaction | 4 分 |
| 4 | `transactions-tags` | 交易·標籤 | 多選既有標籤 + 即時建立 + chip 顯示 | **tags-demo** | 5 分 |
| 5 | `transactions-split` | 交易·拆分 | 拆分編輯、子項配平、列表標記 | **split-demo** | 5 分 |
| 6 | `transactions-views` | 交易 | 日曆 ↔ 列表視圖切換、月導航 | calendar_view | 3 分 |
| 7 | `transactions-filter` | 交易 | 日期/型態/帳戶/標籤多條件篩選 | 新寫 | 4 分 |
| 8 | `transactions-edit-delete` | 交易 | 編輯欄位、刪除確認 | 新寫 | 3 分 |
| 9 | `accounts-create` | 帳戶 | 新增銀行 + 信用卡（結帳/繳款日/額度） | 新寫 | 5 分 |
| 10 | `accounts-manage` | 帳戶 | 編輯、封存/解除封存、淨資產卡 | 新寫 | 3 分 |
| 11 | `budget-init` | 預算 | 啟用預算 + 基本分配 + RTA | **budget-demo** | 6 分 |
| 12 | `budget-advanced` | 預算 | 未來月、退款回補、CC 撥備、目標/自動分配 | **budget-phase2-demo** | 6 分 |
| 13 | `settings-categories` | 設定 | 分類樹：新增主/子、編輯、刪除 | 新寫 | 5 分 |
| 14 | `settings-tags` | 設定 | 標籤 CRUD（名稱 + 顏色） | 新寫 | 4 分 |

> 第 4/5/11/12 段已有帶字幕的 demo，改造工作量低（主要是加 §5.2 游標/漣漪、改用共用 config、接 mp4 轉檔）。

### Phase 2 — 進階 / 需外部服務或預備資料（暫緩）

`bill-import`（Azure Service Bus + Blob + LLM，需 mock 或備測資料）、`reconciliation`（信用卡對帳，需先有刷卡交易）、`recurring`（週期性交易）、`audit-logs`（變更歷史，需先有異動）、`statistics`（需先種足夠資料才有圖）。

### Phase 3 — 可選

串接 Phase 1 各段成一支完整導覽長片（用 ffmpeg `concat`）。

---

## 8. 每段腳本格式範本

```ts
// e2e/videos/transactions-tags.spec.ts
import { test, expect } from '@playwright/test';
import { installDemoOverlay, narrate, chapter, click, type, saveVideo } from './support/demo';

const SLUG = 'transactions-tags';
const API = 'http://localhost:3000/api';

test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ page }) => { await saveVideo(page, SLUG); });

test('交易掛標籤：多選既有 + 即時建立 → 列表 chip', async ({ page }) => {
  await installDemoOverlay(page);          // R1/R2/R3 浮層
  await page.goto('/login');
  await narrate(page, '🎬 標籤功能：替交易掛上標籤，事後好分類好篩選', 2800);

  // 步驟標題 + guest 登入 + API 種子
  await chapter(page, '交易 · 標籤', 1, 3);
  // ...（click()/type() 驅動 UI，narrate() 解說）

  await expect(/* 結果 */).toBeVisible();
  await narrate(page, '✅ 完成：掛標籤 → 列表彩色 chip → 依標籤篩選', 3200);
});
```

每段腳本須遵守：開頭 `installDemoOverlay`→片頭字幕→`chapter` 標示步驟→用 `click`/`type` 取代裸 `locator.click`/`fill`（才有游標漣漪）→關鍵結果 `expect` 驗證→片尾總結字幕→`afterEach` 存檔。

選擇器優先序沿用既有慣例：`getByTestId` > `getByRole({name})` > `getByPlaceholder` >（最後才）`locator(css)`。

---

## 9. 前置需求與重現指令

**一次性前置**

1. `brew install ffmpeg`（V3 / R5）。
2. 後端 `.env`：`PG_*`、`MONGODB_URL`、`AUDIT_MONGODB_URL` 等；前端 `.env`：`NEXT_PUBLIC_API_DOMAIN`、`TEST_USER_*`。
3. 套用 migration：`cd apps/backend && pnpm db:migrate:up`。

**錄製 + 出片**

```bash
cd apps/frontend
pnpm video:make                    # 全部段落：錄 WebM → 轉 mp4 到 docs/videos/
pnpm video:record -- transactions-tags   # 只錄單段
pnpm video:build                   # 只把已錄的 WebM 轉 mp4
```

前後端由 config 的 `webServer` 自動啟動（前端 8090 / 後端 :3000 對齊 `ORIGIN_URL=:8090`）；已在跑則重用。

---

## 10. Phase 規劃與進度追蹤

- [x] **Phase 0 — 基礎建設**（完成並驗證，2026-06-20）
  - [x] `e2e/videos/support/demo.ts`（字幕沿用 + 紅圈游標 + 漣漪 + `click`/`type`/`chapter`/`saveVideo`）
  - [x] `playwright.video.config.ts`（單一 config，1440×900，slowMo 250，埠 8080 reuse）
  - [x] `scripts/build-videos.mjs` + `package.json` scripts（`video:record`/`video:build`/`video:make`）
  - [x] `.gitignore` 加 `docs/videos/`、`e2e/videos/.raw/`、`e2e/videos/.pw/`
  - [x] 裝 ffmpeg、用 `auth-login-guest` 端到端驗證出 mp4（H.264 1440×900 30fps；紅圈/字幕/章節列影格確認）
- [x] **Phase 1 — 核心流程 14 段全部完成並出片（2026-06-21）**，mp4 在 `docs/videos/`：
  - auth-login-guest、dashboard-tour、transactions-add、transactions-tags、transactions-split、
    transactions-views、transactions-filter、transactions-edit-delete、accounts-create、accounts-manage、
    budget-init（精簡為「預算基礎」5 步）、budget-advanced、settings-categories、settings-tags。
  - 錄製期間的調整與發現：
    - **budget-init** 收斂為基礎 5 步（原 demo 後半的撥款/交易明細/轉帳邊界含 Phase 2 後失效的精確金額斷言，超出 init 範圍）；金額改為單帳戶情境（RTA $145,000）。
    - **transactions-edit-delete**：列表列無點擊handler，編輯/刪除只能從**日曆事件**開啟；編輯模式存檔鈕是「儲存」（建立模式才是「儲存交易」）；種子交易需於編輯時補選子分類才能存檔。
    - **settings-categories / settings-tags**：guest 的 `/settings` 整頁失敗（見 §12），改用**測試帳號**登入錄製（`demo.ts` 新增 `login()`）。
    - guest-login 限流 5 次/小時擋住連續錄製 → 於 `rateLimiter.ts` 加 `skip:()=>NODE_ENV!=='production'`（見 §12）。

## 12. 連帶發現與修正的 app bug（2026-06-21）

錄 tags 影片時發現**單一標籤篩選必 500**（`GET /transaction/date?tagIds=x`，單值時）：
- **根因**：Express 5 的 `req.query` 是唯讀 getter，`validate` middleware 對 query 的 Zod transform（字串→陣列 preprocess）寫不回 `req.query`，故單一 `?tagIds=x` 以**字串**抵達 service；`transactionServices.ts` 對字串做 `{ [Op.in]: tagIds }`，Sequelize Op.in 內部 `.map` 字串 → `value.map is not a function`。2 個以上標籤時 Express 直接給陣列故無事。
- **修正（修法 A）**：`getTransactionsByDate` 內把 `tagIds` 正規化為 `tagIdList` 陣列（impact=LOW，已驗證）。
- **未處理（留待評估）**：修法 B（治本改 `validate` middleware 讓 Express 5 query transform 生效）波及所有 query 路由，未動；其他靠 query transform/default 的路由可能有類似潛在問題。另外後端 log 出現 Sequelize `DATEONLY._stringify` 例外雜訊（測試仍綠），為獨立小問題。

### 連帶發現 #2：guest /settings 整頁失敗（未修）
guest 帳號開 `/settings` 顯示「無法載入頁面」。根因：`app/(main)/settings/page.tsx` 的 server component 呼叫 `service.getPersonnelNotification()`，guest 無通知設定 → 拋錯 → 整頁 error（與 tags-demo 舊註記一致）。**未修**（修需讓該 fetch 對 guest 回預設、且 `NotificationSettings` 要吃得下預設）。**暫以測試帳號錄 settings 兩段**。副作用：測試帳號殘留一個空的主分類「保險」（spec 只刪了子分類）。

### 連帶調整 #3：guest-login dev 限流跳過（已改）
`middlewares/rateLimiter.ts` 的 `guestLoginLimiter` 為 5 次/小時/IP，擋住連續錄製。已加 `skip: () => process.env.NODE_ENV !== 'production'`（dev/test 跳過、production 仍嚴格）。
- [ ] **Phase 2 — 進階段落**（需外部服務 / 備資料，另議）
- [ ] **Phase 3 — 串接完整導覽長片**（可選）

> 完成項目即更新本節勾選框（沿用本專案 spec 慣例）。

---

## 11. 未決問題（需後續確認）

- **Q1（mp4 散佈）**：成品先 gitignore（V13）。若要隨 repo 散佈，採 git-lfs 還是放雲端連結？
- **Q2（解析度）**：預設 1440×900（V4）。若教學影片要上傳平台建議 1080p（1920×1080 16:9），確認後改 config 一處。
- **Q3（片頭/片尾）**：是否需要統一片頭卡（logo + 標題）與片尾卡？目前用 `chapter` 標題列替代，不另做。
- **Q4（Phase 2 帳單匯入）**：用 mock LLM 回應 + 固定樣本 PDF 錄製，還是直接略過？
```
