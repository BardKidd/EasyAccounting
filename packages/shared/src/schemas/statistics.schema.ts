import { z } from 'zod';
import { PeriodType } from '../constants';

export const getOverviewSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  // periodType: z.enum([PeriodType.WEEK, PeriodType.MONTH, PeriodType.YEAR]),
});

export type GetOverviewSchema = z.infer<typeof getOverviewSchema>;
