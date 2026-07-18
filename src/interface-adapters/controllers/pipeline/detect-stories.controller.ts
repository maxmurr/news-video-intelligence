import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDetectStoriesUseCase } from '@/src/application/use-cases/pipeline/detect-stories.use-case';
import type { StageResult } from '@/src/application/use-cases/pipeline/shared';
import { InputParseError } from '@/src/entities/errors/common';
import type { Story } from '@/src/entities/models/story';

function presenter(result: StageResult<Story[]>, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'detectStories Presenter', op: 'serialize' }, () => ({
    cached: result.cached,
    stories: result.data.map(story => ({
      title: story.title,
      summary: story.summary,
      startTime: story.startTime,
      endTime: story.endTime,
    })),
  }));
}

const inputSchema = z.string().min(1);

export type IDetectStoriesController = ReturnType<typeof detectStoriesController>;

export const detectStoriesController =
  (instrumentationService: IInstrumentationService, detectStoriesUseCase: IDetectStoriesUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'detectStories Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      return presenter(await detectStoriesUseCase(data), instrumentationService);
    });
  };
