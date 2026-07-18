import type {
  TranscriptChunk,
  TranscriptChunkHit,
  TranscriptChunkInsert,
} from '@/src/entities/models/transcript-chunk';

export interface ITranscriptChunksRepository {
  /** Replaces every chunk for a broadcast with `items`, in order. Atomic. */
  replaceChunks(broadcastId: string, items: TranscriptChunkInsert[]): Promise<TranscriptChunk[]>;
  getChunks(broadcastId: string): Promise<TranscriptChunk[]>;
  /** The `limit` chunks across the whole library most similar to `queryEmbedding`, most similar first. */
  searchByVector(queryEmbedding: number[], limit: number): Promise<TranscriptChunkHit[]>;
}
