import { z } from 'zod';

import { timestampSchema } from './timestamp';

export const selectHeadlineSchema = z.object({
  id: z.string(),
  broadcastId: z.string(),
  idx: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  headline: z.string(),
  summary: z.string(),
  createdAt: z.date(),
});
export type Headline = z.infer<typeof selectHeadlineSchema>;

/**
 * One headline as the stage emits it, aligned 1:1 with the detected stories.
 * The repository assigns `idx` from the array position.
 */
export const insertHeadlineSchema = z.object({
  startTime: timestampSchema,
  endTime: timestampSchema,
  headline: z.string(),
  summary: z.string(),
});
export type HeadlineInsert = z.infer<typeof insertHeadlineSchema>;
