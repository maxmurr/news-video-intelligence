import { z } from 'zod';

export const selectBroadcastSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string(),
  size: z.number(),
  uploadedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Broadcast = z.infer<typeof selectBroadcastSchema>;

export const insertBroadcastSchema = z.object({
  filename: z.string(),
  url: z.string(),
  size: z.number().int().nonnegative(),
});
export type BroadcastInsert = z.infer<typeof insertBroadcastSchema>;
