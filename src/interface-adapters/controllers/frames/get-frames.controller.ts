import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetFramesUseCase } from '@/src/application/use-cases/frames/get-frames.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Frame } from '@/src/entities/models/frame';

function presenter(frames: Frame[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getFrames Presenter', op: 'serialize' }, () =>
    frames.map(frame => ({
      id: frame.id,
      broadcastId: frame.broadcastId,
      idx: frame.idx,
      startTime: frame.startTime,
      endTime: frame.endTime,
      headline: frame.headline,
      frameTime: frame.frameTime,
      reason: frame.reason,
      frameUrl: frame.frameUrl,
      createdAt: frame.createdAt.toISOString(),
    })),
  );
}

const inputSchema = z.string().min(1);

export type IGetFramesController = ReturnType<typeof getFramesController>;

export const getFramesController =
  (instrumentationService: IInstrumentationService, getFramesUseCase: IGetFramesUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'getFrames Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const frames = await getFramesUseCase(data);
      return presenter(frames, instrumentationService);
    });
  };
