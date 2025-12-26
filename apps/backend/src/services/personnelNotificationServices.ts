import PersonnelNotification from '@/models/personnel_notification';
import { PersonnelNotificationSchema } from '@repo/shared';

const postPersonnelNotification = async (
  userId: string | null,
  payload: PersonnelNotificationSchema
) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  const result = await PersonnelNotification.create({
    userId,
    dailyReminder: payload.isDailyNotification,
    weeklySummaryNotice: payload.isWeeklySummaryNotification,
    monthlyAnalysisNotice: payload.isMonthlyAnalysisNotification,
  });
  if (!result) throw new Error('Register personnel notification failed');
  return true;
};

const getPersonnelNotification = async (userId: string) => {
  const result = await PersonnelNotification.findOne({
    where: { userId },
    attributes: [
      'dailyReminder',
      'weeklySummaryNotice',
      'monthlyAnalysisNotice',
    ],
  });
  if (!result) throw new Error('Get personnel notification failed');
  return {
    isDailyNotification: result.dailyReminder,
    isWeeklySummaryNotification: result.weeklySummaryNotice,
    isMonthlyAnalysisNotification: result.monthlyAnalysisNotice,
  };
};

const putPersonnelNotification = async (
  userId: string,
  payload: PersonnelNotificationSchema
) => {
  const result = await PersonnelNotification.update(
    {
      dailyReminder: payload.isDailyNotification,
      weeklySummaryNotice: payload.isWeeklySummaryNotification,
      monthlyAnalysisNotice: payload.isMonthlyAnalysisNotification,
    },
    { where: { userId } }
  );
  if (!result) throw new Error('Update personnel notification failed');
  return true;
};

export default {
  postPersonnelNotification,
  getPersonnelNotification,
  putPersonnelNotification,
};
