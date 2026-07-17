import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetStoriesUseCase } from '@/src/application/use-cases/stories/get-stories.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Story } from '@/src/entities/models/story';

function presenter(stories: Story[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getStories Presenter', op: 'serialize' }, () =>
    stories.map(story => ({
      id: story.id,
      broadcastId: story.broadcastId,
      idx: story.idx,
      title: story.title,
      summary: story.summary,
      startTime: story.startTime,
      endTime: story.endTime,
      createdAt: story.createdAt.toISOString(),
    })),
  );
}

const inputSchema = z.string().min(1);

export type IGetStoriesController = ReturnType<typeof getStoriesController>;

export const getStoriesController =
  (instrumentationService: IInstrumentationService, getStoriesUseCase: IGetStoriesUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'getStories Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const stories = await getStoriesUseCase(data);
      return presenter(stories, instrumentationService);
    });
  };
