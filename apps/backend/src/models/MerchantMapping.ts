import Sequelize, { Model, Optional } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';

export interface MerchantMappingAttributes {
  id: string;
  merchantName: string;
  categoryId: string;
  matchCount: number;
}

export interface MerchantMappingCreationAttributes
  extends Optional<MerchantMappingAttributes, 'id' | 'matchCount'> {}

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
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['merchantName', 'categoryId'],
        name: 'merchant_mapping_merchantName_categoryId_uk',
      },
    ],
  },
);

export default MerchantMapping;
