# Task B: 後端 API 調整

> 調整後端以支援日曆視圖的拖放功能，特別是操作類交易的連動更新。

---

## 目標

1. 新增 shared utils 供前後端共用
2. 修改 `updateIncomeExpense` 支援 `linkId` 連動更新

---

## 參考文檔

| 文檔                | 路徑                                                                                                                                    | 說明                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **主規格書**        | [calendar_view_spec.md](file:///Users/rinouo/Frontend/Projects/EasyAccounting/docs/specs/calendar_view_spec.md)                         | 第 203-296 行說明後端需求    |
| **交易規格**        | [transaction_spec.md](file:///Users/rinouo/Frontend/Projects/EasyAccounting/docs/specs/transaction_spec.md)                             | Transaction schema           |
| **交易 Service**    | [transactionServices.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/services/transactionServices.ts)        | 需修改 `updateIncomeExpense` |
| **交易 Controller** | [transactionController.ts](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/controllers/transactionController.ts) | API endpoint 定義            |

---

## 工作項目

### 1. 新增 Shared Utils

在 `packages/shared/src/utils/transactionUtils.ts` 新增：

```typescript
import { TransactionType, RootType } from '@repo/shared';

/**
 * 判斷是否為操作類交易（有 targetAccountId）
 */
export function isOperateTransaction(tx: TransactionType): boolean {
  return tx.targetAccountId !== null && tx.targetAccountId !== undefined;
}

/**
 * 判斷是否為操作類交易的扣款方（type = EXPENSE 且有 targetAccountId）
 */
export function isOutgoingTransfer(tx: TransactionType): boolean {
  return isOperateTransaction(tx) && tx.type === RootType.EXPENSE;
}

/**
 * 判斷是否為操作類交易的收款方（type = INCOME 且有 targetAccountId）
 */
export function isIncomingTransfer(tx: TransactionType): boolean {
  return isOperateTransaction(tx) && tx.type === RootType.INCOME;
}
```

並在 `packages/shared/src/index.ts` 匯出。

### 2. 修改 updateIncomeExpense

在 `apps/backend/src/services/transactionServices.ts` 的 `updateIncomeExpense` 函式中，新增 `linkId` 連動邏輯：

```typescript
// 在更新 transaction 後，檢查是否有 linked transaction
if (transaction.linkId && data.date) {
  const linkedTransaction = await Transaction.findOne({
    where: { id: transaction.linkId, userId },
    transaction: t, // 使用同一個 DB transaction
  });
  if (linkedTransaction) {
    await linkedTransaction.update({ date: data.date }, { transaction: t });
  }
}
```

> [!IMPORTANT]
> 必須在同一個 Database Transaction 內完成，避免部分更新成功的 data inconsistency。

### 3. 確認現有篩選邏輯

確認 `getTransactionsByDate` 已正確排除操作類的收款方：

```sql
WHERE NOT (
  "targetAccountId" IS NOT NULL
  AND "type" = '收入'
)
```

根據 spec 第 200 行，這個邏輯已存在於第 69-75 行，只需確認無誤。

---

## 單元測試

### 測試 shared utils

```typescript
describe('transactionUtils', () => {
  describe('isOperateTransaction', () => {
    it('should return true when targetAccountId exists', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.EXPENSE };
      expect(isOperateTransaction(tx)).toBe(true);
    });

    it('should return false when targetAccountId is null', () => {
      const tx = { targetAccountId: null, type: RootType.EXPENSE };
      expect(isOperateTransaction(tx)).toBe(false);
    });
  });

  describe('isOutgoingTransfer', () => {
    it('should return true for EXPENSE with targetAccountId', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.EXPENSE };
      expect(isOutgoingTransfer(tx)).toBe(true);
    });

    it('should return false for INCOME with targetAccountId', () => {
      const tx = { targetAccountId: 'acc-123', type: RootType.INCOME };
      expect(isOutgoingTransfer(tx)).toBe(false);
    });
  });
});
```

### 測試 linkId 連動更新

```typescript
describe('updateIncomeExpense with linkId', () => {
  it('should update linked transaction date when updating source transaction', async () => {
    // 建立兩筆 linked transactions
    const source = await createTransaction({ linkId: null, type: 'EXPENSE' });
    const target = await createTransaction({
      linkId: source.id,
      type: 'INCOME',
    });
    await source.update({ linkId: target.id });

    // 更新 source 的 date
    await updateIncomeExpense(source.id, { date: '2026-03-01' }, userId);

    // 驗證 target 也被更新
    const updatedTarget = await Transaction.findByPk(target.id);
    expect(updatedTarget.date).toBe('2026-03-01');
  });
});
```

---

## 驗收標準

- [ ] `isOperateTransaction`, `isOutgoingTransfer`, `isIncomingTransfer` 函式可用且有測試
- [ ] `updateIncomeExpense` 更新 `date` 時，linked transaction 同步更新
- [ ] 使用 DB Transaction 確保原子性
- [ ] 現有 `getTransactionsByDate` 的操作類篩選邏輯正確

---

## 注意事項

- 只有更新 `date` 欄位需要連動，其他欄位（如 amount, description）不需要
- 確保 `deleteTransaction` 的現有 linkId 處理邏輯不受影響
