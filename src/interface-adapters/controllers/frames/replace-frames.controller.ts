import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IReplaceFramesUseCase } from '@/src/application/use-cases/frames/replace-frames.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { insertFrameSchema, type Frame } from '@/src/entities/models/frame';

function presenter(frames: Frame[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'replaceFrames Presenter', op: 'serialize' }, () =>
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

const inputSchema = z.object({
  broadcastId: z.string().min(1),
  items: z.array(insertFrameSchema),
});

export type IReplaceFramesController = ReturnType<typeof replaceFramesController>;

export const replaceFramesController =
  (instrumentationService: IInstrumentationService, replaceFramesUseCase: IReplaceFramesUseCase) =>
  (input: Partial<z.infer<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'replaceFrames Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid data', { cause: inputParseError });

      const frames = await replaceFramesUseCase(data.broadcastId, data.items);
      return presenter(frames, instrumentationService);
    });
  };
