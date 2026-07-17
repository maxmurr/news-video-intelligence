import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IReplaceStoriesUseCase } from '@/src/application/use-cases/stories/replace-stories.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { insertStorySchema, type Story } from '@/src/entities/models/story';

function presenter(stories: Story[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'replaceStories Presenter', op: 'serialize' }, () =>
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

const inputSchema = z.object({
  broadcastId: z.string().min(1),
  items: z.array(insertStorySchema),
});

export type IReplaceStoriesController = ReturnType<typeof replaceStoriesController>;

export const replaceStoriesController =
  (instrumentationService: IInstrumentationService, replaceStoriesUseCase: IReplaceStoriesUseCase) =>
  (input: Partial<z.infer<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'replaceStories Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid data', { cause: inputParseError });

      const stories = await replaceStoriesUseCase(data.broadcastId, data.items);
      return presenter(stories, instrumentationService);
    });
  };
