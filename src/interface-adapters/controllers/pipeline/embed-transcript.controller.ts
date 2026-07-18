import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IEmbedTranscriptUseCase } from '@/src/application/use-cases/pipeline/embed-transcript.use-case';
import type { StageResult } from '@/src/application/use-cases/pipeline/shared';
import { InputParseError } from '@/src/entities/errors/common';
import type { TranscriptChunk } from '@/src/entities/models/transcript-chunk';

function presenter(result: StageResult<TranscriptChunk[]>, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'embedTranscript Presenter', op: 'serialize' }, () => ({
    cached: result.cached,
    count: result.data.length,
  }));
}

const inputSchema = z.string().min(1);

export type IEmbedTranscriptController = ReturnType<typeof embedTranscriptController>;

export const embedTranscriptController =
  (instrumentationService: IInstrumentationService, embedTranscriptUseCase: IEmbedTranscriptUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'embedTranscript Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      return presenter(await embedTranscriptUseCase(data), instrumentationService);
    });
  };
