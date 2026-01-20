import Sequelize, { Model } from 'sequelize';
import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import {
  InstallmentPlanType,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RewardsType,
} from '@repo/shared';

type InstallmentPlanCreationAttributes = Omit<InstallmentPlanType, 'id'>;

interface InstallmentPlanInstance
  extends Model<InstallmentPlanType, InstallmentPlanCreationAttributes>,
    InstallmentPlanType {}

const InstallmentPlan = sequelize.define<InstallmentPlanInstance>(
  'installment_plan',
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
    totalAmount: {
      type: Sequelize.DECIMAL(20, 5),
      allowNull: false,
    },
    totalInstallments: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    interestType: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: InterestType.NONE,
    },
    calculationMethod: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: CalculationMethod.ROUND,
    },
    remainderPlacement: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: RemainderPlacement.FIRST,
    },
    gracePeriod: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    rewardsType: {
      type: Sequelize.STRING,
      defaultValue: RewardsType.EVERY,
      allowNull: false,
    },
  },
  TABLE_DEFAULT_SETTING
);

export default InstallmentPlan;
