import AuditLog, { IAuditChange } from '@/models/auditLog';
import { isAuditReady } from '@/utils/auditMongo';
import {
  AuditAction,
  AuditEntityType,
  AuditLogListResponse,
  AuditLogType,
  ListAuditLogsQuery,
} from '@repo/shared';

type Snapshot = Record<string, unknown> | null | undefined;

// diff 時忽略的雜訊欄位：時間戳與 ORM 內部欄不算「使用者語意上的變更」。
const DIFF_NOISE_FIELDS = new Set(['updatedAt', 'createdAt', 'deletedAt']);

/**
 * 計算兩個快照的 top-level 欄位差異（UPDATE 用）。純函式，便於單元測試。
 * 以 JSON 字串比較值（涵蓋數字/字串/巢狀物件的淺層判等），忽略雜訊欄位。
 */
export const computeChanges = (
  before: Snapshot,
  after: Snapshot,
): IAuditChange[] => {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: IAuditChange[] = [];
  for (const key of keys) {
    if (DIFF_NOISE_FIELDS.has(key)) continue;
    const from = (before as Record<string, unknown>)[key];
    const to = (after as Record<string, unknown>)[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field: key, from, to });
    }
  }
  return changes;
};

/**
 * 安全擷取 Sequelize instance 的快照給 audit 用。**永不 throw**：
 * toJSON 不存在（如測試的純 mock）或執行丟錯時退回原值 / null，
 * 確保「audit 的快照擷取也不會中斷使用者主流程」。
 */
export const safeSnapshot = (v: any): any => {
  if (v == null) return null;
  try {
    return typeof v.toJSON === 'function' ? v.toJSON() : v;
  } catch {
    return null;
  }
};

const ENTITY_NOUN: Record<AuditEntityType, string> = {
  [AuditEntityType.TRANSACTION]: '交易',
  [AuditEntityType.TRANSFER]: '轉帳',
  [AuditEntityType.ACCOUNT]: '帳戶',
  [AuditEntityType.CATEGORY]: '分類',
  [AuditEntityType.TAG]: '標籤',
  [AuditEntityType.BUDGET]: '預算',
};

const ACTION_VERB: Record<AuditAction, string> = {
  [AuditAction.CREATE]: '新增',
  [AuditAction.UPDATE]: '修改',
  [AuditAction.DELETE]: '刪除',
};

/** 通用摘要：「新增帳戶「玉山銀行」」。交易另有 txAuditSummary（含金額）。 */
export const genericAuditSummary = (
  action: AuditAction,
  entityType: AuditEntityType,
  label?: string | null,
): string =>
  `${ACTION_VERB[action]}${ENTITY_NOUN[entityType]}${label ? `「${label}」` : ''}`;

interface RecordAuditInput {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary?: string | null;
  // 快照為任意 JSON（Sequelize toJSON() 的具型別 / 自組物件皆可）。
  before?: any;
  after?: any;
}

/**
 * 寫入一筆稽核紀錄。**Best-effort、append-only**：
 *  - 設計上由各 service 在 PG transaction **commit 之後** fire-and-forget 呼叫
 *    （`void recordAudit(...)`），audit 失敗絕不回滾或中斷使用者操作。
 *  - 測試環境（NODE_ENV=test）或 audit Mongo 未連線時直接略過，不阻塞、不噴錯。
 *  - 自身吞掉所有例外，只記 log。
 */
export const recordAudit = async (input: RecordAuditInput): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;
  if (!isAuditReady()) {
    console.warn('[Audit] store 未就緒，略過一筆 audit:', input.entityType, input.entityId);
    return;
  }
  try {
    const changes =
      input.action === AuditAction.UPDATE
        ? computeChanges(input.before, input.after)
        : [];
    await AuditLog.create({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      changes,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[Audit] 寫入失敗（已略過，不影響主流程）:', err);
  }
};

/** 分頁讀取某使用者的稽核紀錄。命中 { userId, createdAt } 或實體歷史複合索引。 */
export const listAuditLogs = async (
  userId: string,
  query: ListAuditLogsQuery,
): Promise<AuditLogListResponse> => {
  const filter: Record<string, unknown> = { userId };
  if (query.entityType) filter.entityType = query.entityType;
  if (query.action) filter.action = query.action;
  if (query.entityId) filter.entityId = query.entityId;

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const items: AuditLogType[] = docs.map((d: any) => ({
    id: String(d._id),
    userId: d.userId,
    action: d.action,
    entityType: d.entityType,
    entityId: d.entityId,
    summary: d.summary ?? null,
    before: d.before ?? null,
    after: d.after ?? null,
    changes: Array.isArray(d.changes) ? d.changes : [],
    createdAt: new Date(d.createdAt).toISOString(),
  }));

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export default {
  recordAudit,
  listAuditLogs,
  computeChanges,
  genericAuditSummary,
  safeSnapshot,
};
