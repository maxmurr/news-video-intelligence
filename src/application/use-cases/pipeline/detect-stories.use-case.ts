import { z } from 'zod';

import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IStorySegmentationService } from '@/src/application/services/story-segmentation.service.interface';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { insertStorySchema, type Story } from '@/src/entities/models/story';
import { requireBroadcastByFilename, type StageResult } from './shared';

export type IDetectStoriesUseCase = ReturnType<typeof detectStoriesUseCase>;

export const detectStoriesUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    transcriptsRepository: ITranscriptsRepository,
    storiesRepository: IStoriesRepository,
    storySegmentationService: IStorySegmentationService,
  ) =>
  (filename: string): Promise<StageResult<Story[]>> => {
    return instrumentationService.startSpan({ name: 'detectStories Use Case', op: 'function' }, async () => {
      const broadcast = await requireBroadcastByFilename(broadcastsRepository, filename);

      const existing = await storiesRepository.getStories(broadcast.id);
      if (existing.length > 0) return { data: existing, cached: true };

      const transcript = await transcriptsRepository.getTranscript(broadcast.id);
      if (!transcript) {
        throw new NotFoundError(`No transcript found for ${filename}. Run the transcribe stage first.`);
      }

      const stories = await storySegmentationService.segmentTranscript(transcript.text);

      // Generated data failing entity validation is deterministic — the same
      // output would fail again — so surface it as a fatal InputParseError
      // rather than a plain Error the workflow would burn retries on.
      const parsed = z.array(insertStorySchema).safeParse(stories);
      if (parsed.error) throw new InputParseError('Generated stories failed validation', { cause: parsed.error });

      const saved = await storiesRepository.replaceStories(broadcast.id, parsed.data);
      return { data: saved, cached: false };
    });
  };
