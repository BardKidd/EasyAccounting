import { describe, it, expect } from 'vitest';
import { computeChanges } from '@/services/auditLogService';

describe('auditLogService.computeChanges', () => {
  it('擷取有變動的 top-level 欄位（field / from / to）', () => {
    const before = { amount: 100, description: '午餐', categoryId: 'c1' };
    const after = { amount: 150, description: '午餐', categoryId: 'c2' };

    const changes = computeChanges(before, after);

    expect(changes).toHaveLength(2);
    expect(changes).toContainEqual({ field: 'amount', from: 100, to: 150 });
    expect(changes).toContainEqual({ field: 'categoryId', from: 'c1', to: 'c2' });
    // 未變動的 description 不應出現
    expect(changes.find((c) => c.field === 'description')).toBeUndefined();
  });

  it('忽略時間戳等雜訊欄位（updatedAt / createdAt / deletedAt）', () => {
    const before = { amount: 100, updatedAt: '2026-06-15T00:00:00Z' };
    const after = { amount: 100, updatedAt: '2026-06-16T00:00:00Z' };

    expect(computeChanges(before, after)).toEqual([]);
  });

  it('巢狀物件以深層相等判斷（內容相同→無變更）', () => {
    const before = { extra: { add: 10, minus: 0 } };
    const after = { extra: { add: 10, minus: 0 } };

    expect(computeChanges(before, after)).toEqual([]);
  });

  it('巢狀物件內容不同→記為一筆變更', () => {
    const before = { extra: { add: 10, minus: 0 } };
    const after = { extra: { add: 10, minus: 5 } };

    const changes = computeChanges(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.field).toBe('extra');
  });

  it('新增 / 刪除（before 或 after 為 null）一律回空陣列（非 UPDATE 語意）', () => {
    expect(computeChanges(null, { amount: 100 })).toEqual([]);
    expect(computeChanges({ amount: 100 }, null)).toEqual([]);
  });

  it('涵蓋只存在於單邊的欄位', () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };

    const changes = computeChanges(before, after);
    expect(changes).toContainEqual({ field: 'b', from: undefined, to: 2 });
  });
});
