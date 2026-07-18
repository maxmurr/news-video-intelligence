import { z } from 'zod';

import { timestampSchema } from './timestamp';

/**
 * The read model deliberately omits the embedding. The 1536-float vector is a
 * write-mostly index column — reads for existence checks and citation rendering
 * never need it, and pulling it per chunk would move megabytes for nothing. The
 * search phase reads it through raw similarity SQL, not this shape.
 */
export const selectTranscriptChunkSchema = z.object({
  id: z.string(),
  broadcastId: z.string(),
  idx: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  content: z.string(),
  tokenCount: z.number(),
  createdAt: z.date(),
});
export type TranscriptChunk = z.infer<typeof selectTranscriptChunkSchema>;

/**
 * One chunk as the embed stage emits it. Order is positional: the repository
 * assigns `idx` from the array position, so callers pass chunks in transcript
 * order. `embedding` must match the content it was produced from.
 */
/**
 * A chunk returned by library-wide vector search, with its cosine similarity to
 * the query (1 = identical). Carries `broadcastId` so a cross-broadcast answer
 * can attribute the moment to its source video. When a reranker reorders the
 * candidates, `rerankScore` holds its relevance score (higher = more relevant);
 * it is a different scale from `similarity` and absent when reranking was
 * skipped or fell back to vector order.
 */
export interface TranscriptChunkHit {
  id: string;
  broadcastId: string;
  idx: number;
  startTime: string;
  endTime: string;
  content: string;
  similarity: number;
  rerankScore?: number;
}

export const insertTranscriptChunkSchema = z.object({
  startTime: timestampSchema,
  endTime: timestampSchema,
  content: z.string().min(1),
  embedding: z.array(z.number()),
  tokenCount: z.number().int().nonnegative(),
});
export type TranscriptChunkInsert = z.infer<typeof insertTranscriptChunkSchema>;
