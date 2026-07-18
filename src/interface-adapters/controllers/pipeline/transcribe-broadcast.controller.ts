import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ITranscribeBroadcastUseCase } from '@/src/application/use-cases/pipeline/transcribe-broadcast.use-case';
import type { StageResult } from '@/src/application/use-cases/pipeline/shared';
import { InputParseError } from '@/src/entities/errors/common';
import type { Transcript } from '@/src/entities/models/transcript';

function presenter(result: StageResult<Transcript>, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'transcribeBroadcast Presenter', op: 'serialize' }, () => ({
    cached: result.cached,
    text: result.data.text,
  }));
}

const inputSchema = z.string().min(1);

export type ITranscribeBroadcastController = ReturnType<typeof transcribeBroadcastController>;

export const transcribeBroadcastController =
  (instrumentationService: IInstrumentationService, transcribeBroadcastUseCase: ITranscribeBroadcastUseCase) =>
  (filename: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'transcribeBroadcast Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(filename);
      if (inputParseError) throw new InputParseError('Invalid filename', { cause: inputParseError });

      return presenter(await transcribeBroadcastUseCase(data), instrumentationService);
    });
  };
