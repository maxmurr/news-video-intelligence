import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISearchLibraryUseCase } from '@/src/application/use-cases/broadcasts/search-library.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { TranscriptChunkHit } from '@/src/entities/models/transcript-chunk';

function presenter(hits: TranscriptChunkHit[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'searchLibrary Presenter', op: 'serialize' }, () =>
    hits.map(hit => ({
      broadcastId: hit.broadcastId,
      startTime: hit.startTime,
      endTime: hit.endTime,
      content: hit.content,
      similarity: hit.similarity,
      rerankScore: hit.rerankScore,
    })),
  );
}

const inputSchema = z.object({
  query: z.string(),
  limit: z.number().int().positive().max(50).optional(),
});

export type ISearchLibraryController = ReturnType<typeof searchLibraryController>;

export const searchLibraryController =
  (instrumentationService: IInstrumentationService, searchLibraryUseCase: ISearchLibraryUseCase) =>
  (input: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'searchLibrary Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid search input', { cause: inputParseError });

      return presenter(await searchLibraryUseCase(data.query, data.limit), instrumentationService);
    });
  };
