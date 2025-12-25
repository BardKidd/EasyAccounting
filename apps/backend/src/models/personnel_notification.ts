import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import Sequelize from 'sequelize';

const PersonnelNotification = sequelize.define(
  'personnel_notification',
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
    dailyReminder: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    weeklySummaryNotice: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    monthlyAnalysisNotice: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  TABLE_DEFAULT_SETTING
);

export default PersonnelNotification;
