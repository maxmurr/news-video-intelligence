import { chunkTranscript } from '@/lib/chunking';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { ITranscriptChunksRepository } from '@/src/application/repositories/transcript-chunks.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IEmbeddingService } from '@/src/application/services/embedding.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { TranscriptChunk, TranscriptChunkInsert } from '@/src/entities/models/transcript-chunk';
import { requireBroadcastById, type StageResult } from './shared';

export type IEmbedTranscriptUseCase = ReturnType<typeof embedTranscriptUseCase>;

export const embedTranscriptUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    transcriptsRepository: ITranscriptsRepository,
    transcriptChunksRepository: ITranscriptChunksRepository,
    embeddingService: IEmbeddingService,
  ) =>
  (broadcastId: string): Promise<StageResult<TranscriptChunk[]>> => {
    return instrumentationService.startSpan({ name: 'embedTranscript Use Case', op: 'function' }, async () => {
      const broadcast = await requireBroadcastById(broadcastsRepository, broadcastId);

      const existing = await transcriptChunksRepository.getChunks(broadcast.id);
      if (existing.length > 0) return { data: existing, cached: true };

      const transcript = await transcriptsRepository.getTranscript(broadcast.id);
      if (!transcript) {
        throw new NotFoundError(`No transcript found for ${broadcast.filename}. Run the transcribe stage first.`);
      }

      const drafts = chunkTranscript(transcript.text);
      if (drafts.length === 0) return { data: [], cached: false };

      const embeddings = await embeddingService.embedDocuments(drafts.map(draft => draft.content));
      if (embeddings.length !== drafts.length) {
        throw new Error(`Embedding count ${embeddings.length} does not match ${drafts.length} chunks`);
      }

      const items: TranscriptChunkInsert[] = drafts.map((draft, i) => ({
        startTime: draft.startTime,
        endTime: draft.endTime,
        content: draft.content,
        embedding: embeddings[i],
        tokenCount: draft.tokenCount,
      }));

      const saved = await transcriptChunksRepository.replaceChunks(broadcast.id, items);
      return { data: saved, cached: false };
    });
  };
