# Task D: 測試

> 完成日曆視圖的單元測試和 E2E 測試。

---

## 前置條件

- ✅ Task A 完成（前端元件）
- ✅ Task B 完成（後端 API）
- ✅ Task C 完成（API 串接）

---

## 參考文檔

| 文檔             | 路徑                                                                                                            | 說明                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | --------------------- |
| **主規格書**     | [calendar_view_spec.md](file:///Users/rinouo/Frontend/Projects/EasyAccounting/docs/specs/calendar_view_spec.md) | 第 333-352 行測試策略 |
| **現有前端測試** | 搜尋 `*.test.tsx` / `*.spec.tsx`                                                                                | 參考現有測試風格      |
| **現有後端測試** | 搜尋 `*.test.ts` / `*.spec.ts`                                                                                  | 參考現有測試風格      |

---

## 工作項目

### 1. 單元測試

#### 1.1 transactionToCalendarEvent

```typescript
describe('transactionToCalendarEvent', () => {
  it('should convert transaction to calendar event', () => {
    const tx = {
      id: 'tx-1',
      date: '2026-02-05',
      time: '14:30:00',
      type: RootType.EXPENSE,
      amount: 150,
      description: '午餐',
      linkId: null,
    };

    const event = transactionToCalendarEvent(tx);

    expect(event.id).toBe('tx-1');
    expect(event.title).toBe('午餐');
    expect(event.start.toISOString()).toBe('2026-02-05T14:30:00.000Z');
    expect(event.type).toBe(RootType.EXPENSE);
    expect(event.isTransfer).toBe(false);
  });

  it('should mark transfer transactions', () => {
    const tx = {
      id: 'tx-2',
      linkId: 'tx-3',
      // ...
    };

    const event = transactionToCalendarEvent(tx);
    expect(event.isTransfer).toBe(true);
  });
});
```

#### 1.2 篩選邏輯（前端）

```typescript
describe('filterForCalendar', () => {
  it('should exclude incoming transfers', () => {
    const transactions = [
      { id: '1', targetAccountId: null, type: RootType.EXPENSE },
      { id: '2', targetAccountId: 'acc-1', type: RootType.EXPENSE }, // 顯示
      { id: '3', targetAccountId: 'acc-2', type: RootType.INCOME }, // 不顯示
    ];

    const filtered = filterForCalendar(transactions);

    expect(filtered.map((t) => t.id)).toEqual(['1', '2']);
  });
});
```

#### 1.3 顏色判斷

```typescript
describe('getEventColor', () => {
  it('should return green for income', () => {
    expect(getEventColor(RootType.INCOME)).toBe('bg-emerald-500');
  });

  it('should return red for expense', () => {
    expect(getEventColor(RootType.EXPENSE)).toBe('bg-rose-500');
  });

  it('should return amber for operate (transfer)', () => {
    expect(getEventColor(RootType.EXPENSE, true)).toBe('bg-amber-500');
  });
});
```

### 2. E2E 測試

使用專案現有的 E2E 測試框架（Playwright / Cypress）。

#### 2.1 視圖切換

```typescript
test('should switch between list and calendar view', async ({ page }) => {
  await page.goto('/transactions');

  // 預設日曆視圖
  await expect(page.locator('.rbc-calendar')).toBeVisible();

  // 切換到列表
  await page.click('[data-testid="tab-list"]');
  await expect(page.locator('[data-testid="transaction-table"]')).toBeVisible();

  // 切回日曆
  await page.click('[data-testid="tab-calendar"]');
  await expect(page.locator('.rbc-calendar')).toBeVisible();
});
```

#### 2.2 日曆顯示

```typescript
test('should display transactions on correct dates', async ({ page }) => {
  // 假設有一筆 2026/02/05 的交易
  await page.goto('/transactions?month=2026-02');

  const day5Cell = page.locator('.rbc-date-cell:has-text("5")');
  await expect(day5Cell).toContainText('午餐');
});
```

#### 2.3 點擊 Modal

```typescript
test('should open modal with day transactions', async ({ page }) => {
  await page.goto('/transactions?month=2026-02');

  await page.click('.rbc-date-cell:has-text("5")');

  const modal = page.locator('[data-testid="day-modal"]');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('2026/02/05');
});
```

#### 2.4 拖放更新

```typescript
test('should update date on drag and drop', async ({ page }) => {
  await page.goto('/transactions?month=2026-02');

  const event = page.locator('.rbc-event:has-text("午餐")');
  const targetCell = page.locator('.rbc-date-cell:has-text("10")');

  await event.dragTo(targetCell);

  // 等待 API 呼叫完成
  await page.waitForResponse(/\/transactions\/.+/);

  // 驗證事件移到新日期
  await expect(targetCell).toContainText('午餐');
});
```

#### 2.5 轉帳顯示

```typescript
test('should only show outgoing transfer', async ({ page }) => {
  // 假設有一筆轉帳：A 帳戶轉到 B 帳戶
  await page.goto('/transactions?month=2026-02');

  // 只應顯示一個轉帳事件（扣款方）
  const transferEvents = page.locator('.rbc-event.bg-amber-500');
  await expect(transferEvents).toHaveCount(1);
});
```

---

## 驗收標準

### 單元測試

- [ ] `transactionToCalendarEvent` 轉換正確
- [ ] 轉帳篩選邏輯（只顯示扣款方）
- [ ] 顏色判斷（收入/支出/操作）

### E2E 測試

- [ ] Tab 切換後顯示正確視圖
- [ ] 交易顯示在正確日期
- [ ] 點擊日期開啟 Modal，內容正確
- [ ] 拖放後交易日期更新且 API 被呼叫
- [ ] 轉帳只顯示扣款方，且為橙黃色

---

## 執行指令

```bash
# 單元測試
pnpm test --filter=frontend
pnpm test --filter=backend

# E2E 測試
pnpm e2e
# 或
pnpm playwright test
```

---

## 注意事項

- E2E 測試需要 seed data，確保測試環境有預設交易資料
- 如果使用 MSW 進行 E2E，需確認 MSW 在測試環境正確啟動
