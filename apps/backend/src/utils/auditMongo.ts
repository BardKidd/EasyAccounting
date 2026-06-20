import mongoose, { Connection } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

/**
 * Audit log 專用的 MongoDB 連線。
 *
 * 刻意與主要的 `mongoConnection`（utils/mongodb.ts，承載 KnowledgeChunk / Announcement）
 * 分離成獨立連線：audit log 是 append-only、寫多、需水平擴展的資料，會指向一個本地
 * 的 **sharded cluster（mongos router）**，而其餘 Mongo 資料維持在原連線（Atlas）。
 * 這正是 docs/specs/audit-log-sharding-spec.md 的練習主體。
 *
 * `AUDIT_MONGODB_URL` 未設定時退回 `MONGODB_URL`（單機亦可跑，只是沒有分片可觀察）。
 * `bufferCommands: false`：未連線時操作立即失敗而非無限緩衝，讓 recordAudit 的
 * best-effort 語意（失敗即略過、不阻塞使用者交易）成立。
 */
const url =
  process.env.AUDIT_MONGODB_URL || (process.env.MONGODB_URL as string);

export const auditConnection: Connection = mongoose.createConnection();

let connectingPromise: Promise<Connection> | null = null;

export const connectAuditMongo = async (): Promise<Connection | null> => {
  if (!url) {
    console.log('[AuditMongo] AUDIT_MONGODB_URL / MONGODB_URL 未設定，audit log 停用');
    return null;
  }
  if (auditConnection.readyState === 1) return auditConnection;
  if (connectingPromise) return connectingPromise;

  connectingPromise = auditConnection
    .openUri(url, { bufferCommands: false })
    .then((conn) => {
      console.log('[AuditMongo] Connected (audit log store)');
      return conn;
    })
    .catch((err) => {
      console.error('[AuditMongo] Failed to connect:', err);
      connectingPromise = null;
      throw err;
    });

  return connectingPromise;
};

/** audit 寫入前的就緒檢查：未連線就略過（best-effort），不讓呼叫端等待緩衝逾時。 */
export const isAuditReady = (): boolean => auditConnection.readyState === 1;
