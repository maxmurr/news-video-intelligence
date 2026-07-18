import { z } from 'zod';

import { timestampSchema } from './timestamp';

export const selectFrameSchema = z.object({
  id: z.string(),
  broadcastId: z.string(),
  idx: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  headline: z.string(),
  frameTime: z.string(),
  reason: z.string(),
  frameUrl: z.string(),
  createdAt: z.date(),
});
export type Frame = z.infer<typeof selectFrameSchema>;

/**
 * One representative-frame pick as the stage emits it, aligned 1:1 with the
 * headlines. `frameUrl` holds the extracted jpg's object key in the bucket —
 * the binary stays out of the database, and readers presign the key on demand.
 * The repository assigns `idx` from the array position.
 */
export const insertFrameSchema = z.object({
  startTime: timestampSchema,
  endTime: timestampSchema,
  headline: z.string(),
  frameTime: timestampSchema,
  reason: z.string(),
  frameUrl: z.string(),
});
export type FrameInsert = z.infer<typeof insertFrameSchema>;
