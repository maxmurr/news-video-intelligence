import { z } from 'zod';

import { secondsToTimestamp, timestampToSeconds } from '@/lib/timestamps';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IFramePickerService } from '@/src/application/services/frame-picker.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { insertFrameSchema, type Frame } from '@/src/entities/models/frame';
import { requireBroadcastById, singleFlight, type StageResult } from './shared';

// Frames this close to a story boundary are transition shots where the
// previous story's visuals are still on screen. The picker prompt avoids them
// and the clamp below enforces it server-side.
const FRAME_BOUNDARY_MARGIN_SEC = 15;

export type IExtractFramesUseCase = ReturnType<typeof extractFramesUseCase>;

export const extractFramesUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    headlinesRepository: IHeadlinesRepository,
    framesRepository: IFramesRepository,
    mediaProcessorService: IMediaProcessorService,
    framePickerService: IFramePickerService,
  ) =>
  (broadcastId: string): Promise<StageResult<Frame[]>> => {
    return instrumentationService.startSpan({ name: 'extractFrames Use Case', op: 'function' }, async () => {
      const broadcast = await requireBroadcastById(broadcastsRepository, broadcastId);

      const existing = await framesRepository.getFrames(broadcast.id);
      if (existing.length > 0) return { data: existing, cached: true };

      return singleFlight(`frames:${broadcast.id}`, async () => {
        const cached = await framesRepository.getFrames(broadcast.id);
        if (cached.length > 0) return { data: cached, cached: true };

        const headlines = await headlinesRepository.getHeadlines(broadcast.id);
        if (headlines.length === 0) {
          throw new NotFoundError(`No headlines found for ${broadcast.filename}. Run the headlines stage first.`);
        }

        // Transcript timestamps can drift past the real video length; cap every
        // seek at the actual duration or extraction produces nothing. Probe
        // while the model call is in flight.
        const durationPromise = mediaProcessorService.durationSeconds(broadcast.filename);
        const picks = await framePickerService.pickFrames(broadcast.filename, headlines);
        const lastSeekableSec = Math.max(0, Math.floor(await durationPromise) - 1);

        const items = await Promise.all(
          picks.map(async (pick, i) => {
            const story = headlines[i];
            // Clamp the pick into the story span so a stray model timestamp can't
            // pull a frame from a different story. Keep the boundary margin when
            // the span allows — the model has ignored the prompt rule before.
            const startSec = timestampToSeconds(story.startTime);
            const endSec = timestampToSeconds(story.endTime);
            const margin = endSec - startSec > 3 * FRAME_BOUNDARY_MARGIN_SEC ? FRAME_BOUNDARY_MARGIN_SEC : 0;
            const frameSec = Math.min(
              Math.max(timestampToSeconds(pick.frameTime), startSec + margin),
              endSec - margin,
              lastSeekableSec,
            );

            const frameUrl = await mediaProcessorService.extractFrame(
              broadcast.filename,
              frameSec,
              `story-${i + 1}.jpg`,
            );

            return {
              startTime: story.startTime,
              endTime: story.endTime,
              headline: story.headline,
              frameTime: secondsToTimestamp(frameSec),
              reason: pick.reason,
              frameUrl,
            };
          }),
        );

        const parsed = z.array(insertFrameSchema).length(headlines.length).safeParse(items);
        if (parsed.error) throw new InputParseError('Generated frames failed validation', { cause: parsed.error });

        const saved = await framesRepository.replaceFrames(broadcast.id, parsed.data);
        return { data: saved, cached: false };
      });
    });
  };
