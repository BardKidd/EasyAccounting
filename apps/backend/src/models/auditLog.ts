import { Schema, Document } from 'mongoose';
import { auditConnection } from '@/utils/auditMongo';
import { AuditAction, AuditEntityType } from '@repo/shared';

export interface IAuditChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface IAuditLog extends Document {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: IAuditChange[];
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    // shard key 高位欄。每個 audit 寫入都帶 userId → 跨使用者均勻分散到各 shard。
    userId: { type: String, required: true },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    entityType: {
      type: String,
      enum: Object.values(AuditEntityType),
      required: true,
    },
    entityId: { type: String, required: true },
    summary: { type: String, default: null },
    // 實體快照：CREATE → before=null；DELETE → after=null。Mixed 不限結構，
    // 直接吃 sequelize toJSON()。append-only，永不更新。
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    changes: {
      type: [
        {
          _id: false,
          field: String,
          from: Schema.Types.Mixed,
          to: Schema.Types.Mixed,
        },
      ],
      default: [],
    },
    // shard key 低位欄。讓單一大用戶的資料也能依時間切到多個 chunk / shard
    // （避免 pure-userId 的 jumbo chunk）。由應用層寫入時帶入，故 timestamps: false。
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

// Shard key 對應索引：{ userId: 1, createdAt: 1 }。
// sh.shardCollection 需要一個以 shard key 為前綴的索引；此索引同時服務
// 「某使用者的時間軸 feed」查詢（find({userId}).sort({createdAt:-1}) 走反向掃描）。
// 與 docker/mongo-shard/init-cluster.js 建立的 shard key 必須完全一致。
auditLogSchema.index({ userId: 1, createdAt: 1 });

// 單筆實體完整變更歷史：find({ userId, entityType, entityId }).sort({ createdAt: -1 })。
auditLogSchema.index({ userId: 1, entityType: 1, entityId: 1, createdAt: -1 });

const AuditLog = auditConnection.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
