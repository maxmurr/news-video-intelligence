import { describe, expect, it, vi } from 'vitest';

import type { ITranscriptChunksRepository } from '@/src/application/repositories/transcript-chunks.repository.interface';
import type { IEmbeddingService } from '@/src/application/services/embedding.service.interface';
import type { IRerankService } from '@/src/application/services/rerank.service.interface';
import type { TranscriptChunkHit } from '@/src/entities/models/transcript-chunk';
import { MockRerankService } from '@/src/infrastructure/services/rerank.service.mock';
import { MockInstrumentationService } from '@/src/infrastructure/services/instrumentation.service.mock';
import {
  RETRIEVAL_CANDIDATE_K,
  searchLibraryUseCase,
} from '@/src/application/use-cases/broadcasts/search-library.use-case';

function hit(id: string, content: string, similarity: number): TranscriptChunkHit {
  return { id, broadcastId: `b-${id}`, idx: 0, startTime: '00:00', endTime: '00:05', content, similarity };
}

const embedding: IEmbeddingService = {
  embedDocuments: async () => [],
  embedQuery: async () => [0.1, 0.2, 0.3],
};

function chunksRepo(
  hits: TranscriptChunkHit[],
): ITranscriptChunksRepository & { searchByVector: ReturnType<typeof vi.fn> } {
  return {
    replaceChunks: async () => [],
    getChunks: async () => [],
    searchByVector: vi.fn(async () => hits),
  };
}

function build(repo: ITranscriptChunksRepository, rerank: IRerankService) {
  return searchLibraryUseCase(new MockInstrumentationService(), repo, embedding, rerank);
}

describe('searchLibraryUseCase', () => {
  it('returns no hits for a blank query without touching retrieval', async () => {
    const repo = chunksRepo([]);
    const search = build(repo, new MockRerankService());

    expect(await search('   ')).toEqual([]);
    expect(repo.searchByVector).not.toHaveBeenCalled();
  });

  it('over-fetches the candidate pool then reranks down to the limit', async () => {
    const repo = chunksRepo([
      hit('1', 'weather forecast for the weekend', 0.9),
      hit('2', 'local election results are in', 0.7),
      hit('3', 'sports highlights from last night', 0.5),
    ]);
    const search = build(repo, new MockRerankService());

    const hits = await search('election results', 2);

    expect(repo.searchByVector).toHaveBeenCalledWith(expect.anything(), RETRIEVAL_CANDIDATE_K);
    expect(hits).toHaveLength(2);
    expect(hits[0].id).toBe('2');
    expect(hits[0].rerankScore).toBeGreaterThan(0);
    expect(hits[0].similarity).toBe(0.7);
  });

  it('falls back to vector order when the reranker throws', async () => {
    const repo = chunksRepo([hit('1', 'first', 0.9), hit('2', 'second', 0.8), hit('3', 'third', 0.7)]);
    const failing: IRerankService = {
      rerank: async () => {
        throw new Error('rerank down');
      },
    };
    const search = build(repo, failing);

    const hits = await search('anything', 2);

    expect(hits.map(h => h.id)).toEqual(['1', '2']);
    expect(hits[0].rerankScore).toBeUndefined();
  });

  it('skips the rerank call when there is nothing to reorder', async () => {
    const repo = chunksRepo([hit('1', 'only candidate', 0.9)]);
    const rerank = new MockRerankService();
    const spy = vi.spyOn(rerank, 'rerank');
    const search = build(repo, rerank);

    const hits = await search('anything');

    expect(spy).not.toHaveBeenCalled();
    expect(hits.map(h => h.id)).toEqual(['1']);
  });
});
