import { z } from 'zod';

import { timestampSchema } from './timestamp';

export const selectStorySchema = z.object({
  id: z.string(),
  broadcastId: z.string(),
  idx: z.number(),
  title: z.string(),
  summary: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  createdAt: z.date(),
});
export type Story = z.infer<typeof selectStorySchema>;

/**
 * One detected story as a stage emits it. Order is positional: the repository
 * assigns `idx` from the array position, so callers pass the stories in the
 * order they should render.
 */
export const insertStorySchema = z.object({
  title: z.string(),
  summary: z.string(),
  startTime: timestampSchema,
  endTime: timestampSchema,
});
export type StoryInsert = z.infer<typeof insertStorySchema>;
