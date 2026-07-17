import { z } from 'zod';

export const selectRunSchema = z.object({
  id: z.string(),
  broadcastId: z.string(),
  runId: z.string().nullable(),
  startedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Run = z.infer<typeof selectRunSchema>;

/**
 * One pipeline-start outcome. `runId: null` records a start attempt that failed
 * before the workflow engine returned an id. One record per broadcast — a
 * restart overwrites it.
 */
export const insertRunSchema = z.object({
  broadcastId: z.string(),
  runId: z.string().nullable(),
});
export type RunInsert = z.infer<typeof insertRunSchema>;
