import { z } from 'zod';

export const personnelNotificationSchema = z.object({
  isDailyNotification: z.boolean(),
  isWeeklySummaryNotification: z.boolean(),
  isMonthlyAnalysisNotification: z.boolean(),
});

export type PersonnelNotificationSchema = z.infer<
  typeof personnelNotificationSchema
>;
