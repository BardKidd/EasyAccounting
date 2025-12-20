import { z } from 'zod';

export const getOverviewSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export type GetOverviewSchema = z.infer<typeof getOverviewSchema>;
