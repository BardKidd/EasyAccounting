import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

// 標籤（Tag）：跨分類的橫向標記（「日本旅遊 2026」「可報帳」）。
// 與 Category 正交：Category 撐預算結構（互斥、一筆一個）；Tag 多對多、跨收支轉帳。
// 設計依 docs/specs/split-tags-spec.md（S7/S8/S9）。
export interface TagAttributes {
  id: string;
  userId: string;
  name: string;
  color: string;
  groupName: string | null; // 可選分組（v2 用）
  isArchived: boolean; // 封存＝不刪只隱藏（不入 autocomplete，保留既有關聯）
}

export interface TagCreationAttributes
  extends Optional<
    TagAttributes,
    'id' | 'color' | 'groupName' | 'isArchived'
  > {}

export interface TagInstance
  extends Model<TagAttributes, TagCreationAttributes>,
    TagAttributes {}

const Tag = sequelize.define<TagInstance>(
  'tag',
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
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    color: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '#6b7280',
    },
    groupName: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    },
    isArchived: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    // 硬刪（無歷史保留需求；isArchived 提供「不刪只隱藏」）。避免 soft-delete 殘列撞
    // UNIQUE(userId, name)（同 budget_target 取捨）；刪 tag 由 models/index.ts 的
    // Tag.afterDestroy hook 串接清 transaction_tag。
    paranoid: false,
    indexes: [
      { unique: true, fields: ['userId', 'name'], name: 'tag_user_name_uniq' },
    ],
  },
);

export default Tag;
