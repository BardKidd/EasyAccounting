/**
 * Audit log 分片實驗用的合成資料產生器。
 *
 * 用途：往 audit log 的 MongoDB（本地 sharded cluster）灌入「多使用者 × 大量 append」
 * 的資料，把 chunk 分裂與 balancer 搬移逼出來，方便用 sh.status() / explain() 觀察
 * shard key 的分佈效果（見 docs/specs/audit-log-sharding-spec.md §7 實驗步驟）。
 *
 * 執行：
 *   cd apps/backend
 *   pnpm tsx src/utils/seedAuditLog.ts [總筆數] [使用者數]
 *   # 例：pnpm tsx src/utils/seedAuditLog.ts 200000 500
 *
 * 提示：配合 chunksize=1MB（init-cluster.js 已設）約十幾萬筆即可看到多個 chunk 跨 shard。
 */
import { connectAuditMongo, auditConnection } from '@/utils/auditMongo';
import AuditLog from '@/models/auditLog';
import { AuditAction, AuditEntityType } from '@repo/shared';

const ACTIONS = [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE];
const ENTITY_TYPES = [
  AuditEntityType.TRANSACTION,
  AuditEntityType.TRANSFER,
  AuditEntityType.ACCOUNT,
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

// 用穩定前綴的合成 userId（非真 UUID），方便事後在 mongos 用 userId 範圍觀察分佈。
const makeUserId = (i: number) =>
  `seed-user-${String(i).padStart(6, '0')}`;

const buildDoc = (userId: string, createdAt: Date) => {
  const action = pick(ACTIONS);
  const amount = Math.floor(Math.random() * 5000) + 1;
  const snapshot = {
    type: pick(['支出', '收入']),
    amount,
    description: `合成資料 #${Math.floor(Math.random() * 100000)}`,
  };
  return {
    userId,
    action,
    entityType: pick(ENTITY_TYPES),
    entityId: `seed-${Math.floor(Math.random() * 1_000_000)}`,
    summary: `合成 ${action} $${amount}`,
    before: action === AuditAction.CREATE ? null : snapshot,
    after: action === AuditAction.DELETE ? null : snapshot,
    changes: [],
    createdAt,
  };
};

const main = async () => {
  const total = Number(process.argv[2] || 100_000);
  const userCount = Number(process.argv[3] || 300);
  const BATCH = 5_000;

  const conn = await connectAuditMongo();
  if (!conn) {
    console.error('[seedAuditLog] 無法連線 audit Mongo（檢查 AUDIT_MONGODB_URL）');
    process.exit(1);
  }

  // createdAt 散佈於過去 180 天，讓 { userId, createdAt } 範圍 shard key 有東西可切。
  const now = Date.now();
  const spanMs = 180 * 24 * 60 * 60 * 1000;

  console.log(
    `[seedAuditLog] 開始灌入 ${total} 筆（${userCount} 使用者）至 collection auditlogs ...`,
  );

  let inserted = 0;
  while (inserted < total) {
    const size = Math.min(BATCH, total - inserted);
    const docs = Array.from({ length: size }, () => {
      const userId = makeUserId(Math.floor(Math.random() * userCount));
      const createdAt = new Date(now - Math.random() * spanMs);
      return buildDoc(userId, createdAt);
    });
    await AuditLog.insertMany(docs, { ordered: false });
    inserted += size;
    if (inserted % 25_000 === 0 || inserted === total) {
      console.log(`[seedAuditLog]   ...${inserted}/${total}`);
    }
  }

  console.log('[seedAuditLog] 完成。建議接著在 mongos 執行：');
  console.log('  sh.status()                                  // 看 chunk 在 shard 間的分佈');
  console.log('  db.auditlogs.getShardDistribution()          // 各 shard 的資料量');
  console.log(
    "  db.auditlogs.find({ userId: 'seed-user-000001' }).explain('executionStats')  // targeted vs scatter",
  );

  await auditConnection.close();
  process.exit(0);
};

main().catch((err) => {
  console.error('[seedAuditLog] 失敗:', err);
  process.exit(1);
});
