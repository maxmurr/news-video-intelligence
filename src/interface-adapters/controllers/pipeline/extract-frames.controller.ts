import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IExtractFramesUseCase } from '@/src/application/use-cases/pipeline/extract-frames.use-case';
import type { StageResult } from '@/src/application/use-cases/pipeline/shared';
import { InputParseError } from '@/src/entities/errors/common';
import type { Frame } from '@/src/entities/models/frame';

function presenter(result: StageResult<Frame[]>, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'extractFrames Presenter', op: 'serialize' }, () => ({
    cached: result.cached,
    items: result.data.map(item => ({
      startTime: item.startTime,
      endTime: item.endTime,
      headline: item.headline,
      frameTime: item.frameTime,
      reason: item.reason,
      frameUrl: item.frameUrl,
    })),
  }));
}

const inputSchema = z.string().min(1);

export type IExtractFramesController = ReturnType<typeof extractFramesController>;

export const extractFramesController =
  (instrumentationService: IInstrumentationService, extractFramesUseCase: IExtractFramesUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'extractFrames Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      return presenter(await extractFramesUseCase(data), instrumentationService);
    });
  };
