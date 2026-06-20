import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 在 import service 之前 mock Mongoose model 與 audit 連線就緒狀態，
// 避免真的連 Mongo；讓我們能斷言寫入內容與 best-effort 行為。
const createMock = vi.fn();
const findMock = vi.fn();
const countMock = vi.fn();

vi.mock('@/models/auditLog', () => ({
  default: {
    create: (...args: any[]) => createMock(...args),
    find: (...args: any[]) => findMock(...args),
    countDocuments: (...args: any[]) => countMock(...args),
  },
}));

const isReadyMock = vi.fn(() => true);
vi.mock('@/utils/auditMongo', () => ({
  isAuditReady: () => isReadyMock(),
  auditConnection: {},
  connectAuditMongo: vi.fn(),
}));

import {
  recordAudit,
  listAuditLogs,
  genericAuditSummary,
} from '@/services/auditLogService';
import { AuditAction, AuditEntityType } from '@repo/shared';

const originalEnv = process.env.NODE_ENV;

describe('auditLogService.recordAudit', () => {
  beforeEach(() => {
    createMock.mockReset();
    isReadyMock.mockReturnValue(true);
    // 解除 NODE_ENV=test 守衛，讓 recordAudit 實際走寫入邏輯
    process.env.NODE_ENV = 'development';
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('UPDATE：寫入文件帶入 computeChanges 算出的欄位 diff', async () => {
    createMock.mockResolvedValue({});
    await recordAudit({
      userId: 'u1',
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TRANSACTION,
      entityId: 't1',
      before: { amount: 100, description: '午餐' },
      after: { amount: 200, description: '午餐' },
      summary: '修改支出',
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const doc = createMock.mock.calls[0]![0];
    expect(doc.userId).toBe('u1');
    expect(doc.action).toBe(AuditAction.UPDATE);
    expect(doc.entityId).toBe('t1');
    expect(doc.changes).toContainEqual({ field: 'amount', from: 100, to: 200 });
    // 未變動的 description 不應出現在 changes
    expect(doc.changes.find((c: any) => c.field === 'description')).toBeUndefined();
    expect(doc.createdAt).toBeInstanceOf(Date);
  });

  it('CREATE：before=null、changes=[]（非 UPDATE 不算 diff）', async () => {
    createMock.mockResolvedValue({});
    await recordAudit({
      userId: 'u1',
      action: AuditAction.CREATE,
      entityType: AuditEntityType.TAG,
      entityId: 'tag1',
      after: { name: 'x' },
    });
    const doc = createMock.mock.calls[0]![0];
    expect(doc.before).toBeNull();
    expect(doc.after).toEqual({ name: 'x' });
    expect(doc.changes).toEqual([]);
  });

  it('best-effort：store 未就緒 → 不寫入、不丟錯', async () => {
    isReadyMock.mockReturnValue(false);
    await expect(
      recordAudit({
        userId: 'u',
        action: AuditAction.CREATE,
        entityType: AuditEntityType.TAG,
        entityId: 'x',
      }),
    ).resolves.toBeUndefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('best-effort：寫入丟錯被吞掉 → 不影響呼叫端（resolve）', async () => {
    createMock.mockRejectedValue(new Error('mongo down'));
    await expect(
      recordAudit({
        userId: 'u',
        action: AuditAction.DELETE,
        entityType: AuditEntityType.TAG,
        entityId: 'x',
        before: { name: 'x' },
      }),
    ).resolves.toBeUndefined();
  });

  it('NODE_ENV=test → 直接略過（既有測試不會誤寫 audit）', async () => {
    process.env.NODE_ENV = 'test';
    await recordAudit({
      userId: 'u',
      action: AuditAction.CREATE,
      entityType: AuditEntityType.TAG,
      entityId: 'x',
    });
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('auditLogService.listAuditLogs', () => {
  beforeEach(() => {
    findMock.mockReset();
    countMock.mockReset();
  });

  const makeChain = (rows: any[]) => ({
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(rows),
  });

  it('組出 filter（含篩選）、分頁、_id→id 與 createdAt→ISO 映射', async () => {
    const chain = makeChain([
      {
        _id: 'abc',
        userId: 'u1',
        action: 'CREATE',
        entityType: 'TRANSACTION',
        entityId: 't1',
        summary: 's',
        before: null,
        after: { a: 1 },
        changes: [],
        createdAt: new Date('2026-06-16T00:00:00Z'),
      },
    ]);
    findMock.mockReturnValue(chain);
    countMock.mockResolvedValue(1);

    const res = await listAuditLogs('u1', {
      entityType: AuditEntityType.TRANSACTION,
      page: 1,
      limit: 20,
    } as any);

    expect(findMock).toHaveBeenCalledWith({
      userId: 'u1',
      entityType: 'TRANSACTION',
    });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(res.items[0]!.id).toBe('abc');
    expect(res.items[0]!.createdAt).toBe('2026-06-16T00:00:00.000Z');
    expect(res.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('page 2+ 的 skip 與 totalPages 計算正確', async () => {
    const chain = makeChain([]);
    findMock.mockReturnValue(chain);
    countMock.mockResolvedValue(45);

    const res = await listAuditLogs('u1', { page: 3, limit: 20 } as any);

    expect(chain.skip).toHaveBeenCalledWith(40); // (3-1)*20
    expect(res.pagination.totalPages).toBe(3); // ceil(45/20)
  });

  it('entityId 篩選會帶進 filter（單筆實體歷史）', async () => {
    const chain = makeChain([]);
    findMock.mockReturnValue(chain);
    countMock.mockResolvedValue(0);

    await listAuditLogs('u1', {
      entityType: AuditEntityType.TRANSACTION,
      entityId: 't9',
      page: 1,
      limit: 20,
    } as any);

    expect(findMock).toHaveBeenCalledWith({
      userId: 'u1',
      entityType: 'TRANSACTION',
      entityId: 't9',
    });
  });
});

describe('auditLogService.genericAuditSummary', () => {
  it('組出「動詞 + 名詞 +「標籤」」', () => {
    expect(
      genericAuditSummary(AuditAction.CREATE, AuditEntityType.ACCOUNT, '玉山銀行'),
    ).toBe('新增帳戶「玉山銀行」');
    expect(genericAuditSummary(AuditAction.UPDATE, AuditEntityType.CATEGORY, '飲食')).toBe(
      '修改分類「飲食」',
    );
  });

  it('無 label 時省略引號部分', () => {
    expect(genericAuditSummary(AuditAction.DELETE, AuditEntityType.TAG)).toBe(
      '刪除標籤',
    );
  });
});
