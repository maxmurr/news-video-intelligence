import type { ITranscriptChunksRepository } from '@/src/application/repositories/transcript-chunks.repository.interface';
import type {
  TranscriptChunk,
  TranscriptChunkHit,
  TranscriptChunkInsert,
} from '@/src/entities/models/transcript-chunk';

interface StoredChunk {
  chunk: TranscriptChunk;
  embedding: number[];
}

export class MockTranscriptChunksRepository implements ITranscriptChunksRepository {
  private records: StoredChunk[] = [];

  async replaceChunks(broadcastId: string, items: TranscriptChunkInsert[]): Promise<TranscriptChunk[]> {
    this.records = this.records.filter(record => record.chunk.broadcastId !== broadcastId);
    const now = new Date();
    const created: StoredChunk[] = items.map(({ embedding, ...item }, idx) => ({
      embedding,
      chunk: { id: crypto.randomUUID(), broadcastId, idx, ...item, createdAt: now },
    }));
    this.records.push(...created);
    return created.map(record => record.chunk);
  }

  async getChunks(broadcastId: string): Promise<TranscriptChunk[]> {
    return this.records
      .filter(record => record.chunk.broadcastId === broadcastId)
      .map(record => record.chunk)
      .sort((a, b) => a.idx - b.idx);
  }

  async searchByVector(queryEmbedding: number[], limit: number): Promise<TranscriptChunkHit[]> {
    return this.records
      .map(({ chunk, embedding }) => ({
        id: chunk.id,
        broadcastId: chunk.broadcastId,
        idx: chunk.idx,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        content: chunk.content,
        similarity: cosineSimilarity(queryEmbedding, embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
