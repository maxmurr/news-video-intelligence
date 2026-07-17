import { z } from 'zod';

export const selectTranscriptSchema = z.object({
  id: z.string(),
  broadcastId: z.string(),
  text: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Transcript = z.infer<typeof selectTranscriptSchema>;

export const insertTranscriptSchema = z.object({
  broadcastId: z.string(),
  text: z.string().min(1),
});
export type TranscriptInsert = z.infer<typeof insertTranscriptSchema>;
