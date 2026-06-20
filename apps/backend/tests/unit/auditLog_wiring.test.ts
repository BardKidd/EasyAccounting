import { describe, it, expect, vi, beforeEach } from 'vitest';

// 驗證 mutation service 確實有把 recordAudit 接上、且帶正確的 action / entityType。
// 把 recordAudit 換成 spy、Tag model 換成 stub，不碰真 DB / Mongo。
const recordAuditMock = vi.fn();
vi.mock('@/services/auditLogService', () => ({
  recordAudit: (...a: any[]) => recordAuditMock(...a),
  genericAuditSummary: () => 'summary',
  safeSnapshot: (v: any) =>
    v && typeof v.toJSON === 'function' ? v.toJSON() : v,
}));

const tagFindOne = vi.fn();
const tagCreate = vi.fn();
vi.mock('@/models', () => ({
  Tag: {
    findOne: (...a: any[]) => tagFindOne(...a),
    create: (...a: any[]) => tagCreate(...a),
  },
}));

import tagServices from '@/services/tagServices';
import { AuditAction, AuditEntityType } from '@repo/shared';

describe('tagServices → audit 接線', () => {
  beforeEach(() => {
    recordAuditMock.mockReset();
    tagFindOne.mockReset();
    tagCreate.mockReset();
  });

  it('createTag 建立新標籤後，發出 CREATE / TAG audit（帶新 id）', async () => {
    tagFindOne.mockResolvedValue(null); // 無同名 → 走建立
    tagCreate.mockResolvedValue({
      id: 'tag1',
      name: '旅遊',
      toJSON: () => ({ id: 'tag1', name: '旅遊' }),
    });

    await tagServices.createTag('u1', { name: '旅遊' } as any);

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    const arg = recordAuditMock.mock.calls[0]![0];
    expect(arg.userId).toBe('u1');
    expect(arg.action).toBe(AuditAction.CREATE);
    expect(arg.entityType).toBe(AuditEntityType.TAG);
    expect(arg.entityId).toBe('tag1');
  });

  it('createTag 命中既有同名標籤（冪等回傳）時，不發 audit', async () => {
    tagFindOne.mockResolvedValue({
      id: 'existing',
      toJSON: () => ({ id: 'existing' }),
    });

    await tagServices.createTag('u1', { name: '旅遊' } as any);

    expect(tagCreate).not.toHaveBeenCalled();
    expect(recordAuditMock).not.toHaveBeenCalled();
  });
});
