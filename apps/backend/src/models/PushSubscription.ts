import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

// Web Push 訂閱端點（PWA 推播，spec §6）。一個使用者可有多筆（多裝置 / 多瀏覽器）。
//  - endpoint 全域唯一（同一裝置重複訂閱時 upsert，避免死列累積）。
//  - 送出回 410/404 代表訂閱失效，當場刪除（cron / service 內處理）。
//  - per-user、hard-delete：比照 Tag，避免 soft-delete 殘列撞 UNIQUE(endpoint)；
//    刪 User 由 models/index.ts 的 User.afterDestroy 串接清除。
export interface PushSubscriptionAttributes {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionCreationAttributes
  extends Optional<PushSubscriptionAttributes, 'id'> {}

export interface PushSubscriptionInstance
  extends Model<PushSubscriptionAttributes, PushSubscriptionCreationAttributes>,
    PushSubscriptionAttributes {}

const PushSubscription = sequelize.define<PushSubscriptionInstance>(
  'push_subscription',
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'user', key: 'id' },
      onDelete: 'CASCADE',
    },
    endpoint: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    p256dh: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    auth: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // 硬刪：失效訂閱（410/404）當場移除；避免 soft-delete 殘列撞 UNIQUE(endpoint)。
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['endpoint'],
        name: 'push_subscription_endpoint_uniq',
      },
      { fields: ['userId'], name: 'push_subscription_user_idx' },
    ],
  },
);

export default PushSubscription;
