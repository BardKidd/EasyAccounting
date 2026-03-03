import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import { RecurringFrequency, RecurringTemplateStatus } from '@repo/shared';

export interface RecurringTemplateAttributes {
  id: string;
  userId: string;
  baseTransactionAttrs: {
    accountId: string;
    categoryId: string;
    amount: number;
    type: string;
    description: string | null;
    receipt: string | null;
    paymentFrequency: string;
    extraAdd?: number;
    extraAddLabel?: string;
    extraMinus?: number;
    extraMinusLabel?: string;
    time?: string;
  };
  frequency: RecurringFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthDay?: string | null;
  totalOccurrences: number | null;
  currentOccurrence: number;
  nextExecutionDate: string;
  status: RecurringTemplateStatus;
}

type RecurringTemplateCreationAttributes = Omit<
  RecurringTemplateAttributes,
  'id'
>;

export interface RecurringTemplateInstance
  extends Model<
      RecurringTemplateAttributes,
      RecurringTemplateCreationAttributes
    >,
    RecurringTemplateAttributes {}

const RecurringTemplate = sequelize.define<RecurringTemplateInstance>(
  'recurring_template',
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
    },
    baseTransactionAttrs: {
      type: Sequelize.JSONB,
      allowNull: false,
    },
    frequency: {
      type: Sequelize.ENUM(...Object.values(RecurringFrequency)),
      allowNull: false,
    },
    // 用來在月底邊界推算時還原「使用者原始設定的日期」
    dayOfMonth: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    dayOfWeek: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    monthDay: {
      type: Sequelize.STRING(5), // "MM-DD"
      allowNull: true,
    },
    totalOccurrences: {
      type: Sequelize.INTEGER,
      allowNull: true, // null = 無限
    },
    currentOccurrence: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    nextExecutionDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM(...Object.values(RecurringTemplateStatus)),
      allowNull: false,
      defaultValue: RecurringTemplateStatus.ACTIVE,
    },
  },
  {
    ...TABLE_DEFAULT_SETTING,
    paranoid: false,
  },
);

export default RecurringTemplate;
