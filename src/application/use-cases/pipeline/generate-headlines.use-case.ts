import { z } from 'zod';

import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IHeadlineWriterService } from '@/src/application/services/headline-writer.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { insertHeadlineSchema, type Headline } from '@/src/entities/models/headline';
import { requireBroadcastById, type StageResult } from './shared';

export type IGenerateHeadlinesUseCase = ReturnType<typeof generateHeadlinesUseCase>;

export const generateHeadlinesUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    transcriptsRepository: ITranscriptsRepository,
    storiesRepository: IStoriesRepository,
    headlinesRepository: IHeadlinesRepository,
    headlineWriterService: IHeadlineWriterService,
  ) =>
  (broadcastId: string): Promise<StageResult<Headline[]>> => {
    return instrumentationService.startSpan({ name: 'generateHeadlines Use Case', op: 'function' }, async () => {
      const broadcast = await requireBroadcastById(broadcastsRepository, broadcastId);

      const existing = await headlinesRepository.getHeadlines(broadcast.id);
      if (existing.length > 0) return { data: existing, cached: true };

      const [transcript, stories] = await Promise.all([
        transcriptsRepository.getTranscript(broadcast.id),
        storiesRepository.getStories(broadcast.id),
      ]);
      if (!transcript) {
        throw new NotFoundError(`No transcript found for ${broadcast.filename}. Run the transcribe stage first.`);
      }
      if (stories.length === 0) {
        throw new NotFoundError(`No stories found for ${broadcast.filename}. Run the stories stage first.`);
      }

      const copy = await headlineWriterService.writeHeadlines(stories, transcript.text);

      // Each item aligns 1:1 with its story, inheriting the story's time span.
      const items = copy.map((item, i) => ({
        startTime: stories[i]?.startTime,
        endTime: stories[i]?.endTime,
        headline: item.headline,
        summary: item.summary,
      }));

      const parsed = z.array(insertHeadlineSchema).length(stories.length).safeParse(items);
      if (parsed.error) throw new InputParseError('Generated headlines failed validation', { cause: parsed.error });

      const saved = await headlinesRepository.replaceHeadlines(broadcast.id, parsed.data);
      return { data: saved, cached: false };
    });
  };
