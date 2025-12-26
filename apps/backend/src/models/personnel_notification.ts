import sequelize, { TABLE_DEFAULT_SETTING } from '@/utils/postgres';
import Sequelize, { Model, Optional } from 'sequelize';
import { PersonnelNotificationTypes } from '@repo/shared';

// 定義建立時的屬性，id 是可選的，因為資料庫會自動產生
export interface PersonnelNotificationCreationAttributes
  extends Optional<PersonnelNotificationTypes, 'id'> {}

// Model<讀取, 寫入>, Mixin{補充欄位}
// Model 是告訴 IDE 有一些 DB methods 可以使用
// 後面的 Mixin 告訴 IDE 有哪些 DB 欄位，所以看起來會很像又重複告知一次欄位內容。
export interface PersonnelNotificationInstance
  extends Model<
      PersonnelNotificationTypes,
      PersonnelNotificationCreationAttributes
    >,
    PersonnelNotificationTypes {}

const PersonnelNotification = sequelize.define<PersonnelNotificationInstance>(
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
