import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface MerchantMappingAttributes {
  id: string;
  // per-user 隔離：每個使用者只學到 / 只看得到自己的商家→分類對應。
  // 過去為全域表（無 userId），全域 row 的 categoryId 會指向他人私有分類 → 跨使用者洩漏。
  userId: string;
  merchantName: string;
  categoryId: string;
  matchCount: number;
  // 使用者可停用某條學到的對應（不刪除、不參與 billParse 匹配）。
  isEnabled: boolean;
}

export interface MerchantMappingCreationAttributes
  extends Optional<
    MerchantMappingAttributes,
    'id' | 'matchCount' | 'isEnabled'
  > {}

export interface MerchantMappingInstance
  extends Model<MerchantMappingAttributes, MerchantMappingCreationAttributes>,
    MerchantMappingAttributes {}

const MerchantMapping = sequelize.define<MerchantMappingInstance>(
  'merchant_mapping',
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
      references: {
        model: 'user',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    merchantName: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    categoryId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'category',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    matchCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    isEnabled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'merchantName', 'categoryId'],
        name: 'merchant_mapping_user_merchant_category_uk',
      },
    ],
  },
);

export default MerchantMapping;
