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

export default {
  postPersonnelNotification,
};
