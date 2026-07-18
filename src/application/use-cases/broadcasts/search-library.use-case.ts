import type { ITranscriptChunksRepository } from '@/src/application/repositories/transcript-chunks.repository.interface';
import type { IEmbeddingService } from '@/src/application/services/embedding.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRerankService } from '@/src/application/services/rerank.service.interface';
import type { TranscriptChunkHit } from '@/src/entities/models/transcript-chunk';

/** How many chunks library retrieval feeds into the desk assistant by default. */
export const RETRIEVAL_TOP_K = 10;

/**
 * How many vector candidates the reranker sees before it picks the top-k. Wide
 * enough to recover moments cosine ranks low; the rerank call bounds the cost.
 */
export const RETRIEVAL_CANDIDATE_K = 50;

export type ISearchLibraryUseCase = ReturnType<typeof searchLibraryUseCase>;

/**
 * Semantic retrieval across every broadcast's chunks — the desk assistant's
 * library search. Vector recall casts a wide net, then the reranker reorders it
 * by query relevance and keeps the top-k. An empty query or a library with no
 * chunks yields no hits; a rerank failure falls back to vector order.
 */
export const searchLibraryUseCase =
  (
    instrumentationService: IInstrumentationService,
    transcriptChunksRepository: ITranscriptChunksRepository,
    embeddingService: IEmbeddingService,
    rerankService: IRerankService,
  ) =>
  (query: string, limit: number = RETRIEVAL_TOP_K): Promise<TranscriptChunkHit[]> => {
    return instrumentationService.startSpan({ name: 'searchLibrary Use Case', op: 'function' }, async () => {
      const trimmed = query.trim();
      if (trimmed.length === 0) return [];

      const embedding = await embeddingService.embedQuery(trimmed);
      const candidates = await transcriptChunksRepository.searchByVector(
        embedding,
        Math.max(RETRIEVAL_CANDIDATE_K, limit),
      );
      if (candidates.length <= 1) return candidates.slice(0, limit);

      try {
        const ranked = await rerankService.rerank(
          trimmed,
          candidates.map(candidate => candidate.content),
          limit,
        );
        return ranked.map(({ index, score }) => ({ ...candidates[index], rerankScore: score }));
      } catch {
        return candidates.slice(0, limit);
      }
    });
  };
