import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetTranscriptUseCase } from '@/src/application/use-cases/transcripts/get-transcript.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Transcript } from '@/src/entities/models/transcript';

function presenter(transcript: Transcript, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getTranscript Presenter', op: 'serialize' }, () => ({
    id: transcript.id,
    broadcastId: transcript.broadcastId,
    text: transcript.text,
    createdAt: transcript.createdAt.toISOString(),
    updatedAt: transcript.updatedAt.toISOString(),
  }));
}

const inputSchema = z.string().min(1);

export type IGetTranscriptController = ReturnType<typeof getTranscriptController>;

export const getTranscriptController =
  (instrumentationService: IInstrumentationService, getTranscriptUseCase: IGetTranscriptUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter> | null> => {
    return instrumentationService.startSpan({ name: 'getTranscript Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const transcript = await getTranscriptUseCase(data);
      return transcript ? presenter(transcript, instrumentationService) : null;
    });
  };
