import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISaveTranscriptUseCase } from '@/src/application/use-cases/transcripts/save-transcript.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Transcript } from '@/src/entities/models/transcript';

function presenter(transcript: Transcript, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'saveTranscript Presenter', op: 'serialize' }, () => ({
    id: transcript.id,
    broadcastId: transcript.broadcastId,
    text: transcript.text,
    createdAt: transcript.createdAt.toISOString(),
    updatedAt: transcript.updatedAt.toISOString(),
  }));
}

const inputSchema = z.object({ broadcastId: z.string().min(1), text: z.string().min(1) });

export type ISaveTranscriptController = ReturnType<typeof saveTranscriptController>;

export const saveTranscriptController =
  (instrumentationService: IInstrumentationService, saveTranscriptUseCase: ISaveTranscriptUseCase) =>
  (input: Partial<z.infer<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'saveTranscript Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid data', { cause: inputParseError });

      const transcript = await saveTranscriptUseCase(data);
      return presenter(transcript, instrumentationService);
    });
  };
