import { z } from 'zod';

import { secondsToTimestamp, timestampToSeconds, transcriptTimestamps } from '@/lib/timestamps';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import type { IStorySegmentationService } from '@/src/application/services/story-segmentation.service.interface';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { insertStorySchema, type Story, type StoryInsert } from '@/src/entities/models/story';
import { requireBroadcastById, singleFlight, type StageResult } from './shared';

// Transcript timestamps can drift past the real video length (the ASR model
// hallucinates trailing lines), so cap every story span at the actual
// duration or the span advertises footage that does not exist. Stories that
// start at or past the end are pure hallucination — drop them rather than
// persist a zero-length span pinned at the final frame. A probe that yields
// no usable duration (ffprobe can print "N/A" or nothing) leaves the spans
// untouched instead of poisoning them all.
function clampToDuration(stories: StoryInsert[], durationSeconds: number): StoryInsert[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return stories;
  const lastSec = Math.floor(durationSeconds);
  return stories
    .filter(story => timestampToSeconds(story.startTime) < lastSec)
    .map(story => {
      const endSec = Math.min(timestampToSeconds(story.endTime), lastSec);
      return { ...story, endTime: secondsToTimestamp(endSec) };
    });
}

// The segmentation model returns approximate boundaries — a start can land a few
// seconds off any real transcript line, or mid-line. Snap each story's start
// down to the transcript line it falls in and make spans a contiguous partition
// (each end is the next start). Story spans then always align to lines the
// transcript UI, citations, and frame extraction can seek to. The first story
// anchors to the opening line so the broadcast is covered from the top; stories
// that collapse onto an already-used line are dropped as over-segmentation.
function snapStoriesToTranscript(stories: StoryInsert[], transcript: string, durationSeconds: number): StoryInsert[] {
  const capped = clampToDuration(stories, durationSeconds);
  const lines = transcriptTimestamps(transcript);
  if (capped.length === 0 || lines.length === 0) return capped;

  const lineSeconds = lines.map(timestampToSeconds);
  const floorLineIndex = (seconds: number): number => {
    let index = 0;
    for (let i = 0; i < lineSeconds.length && lineSeconds[i] <= seconds; i++) index = i;
    return index;
  };

  const chosen: Array<{ index: number; story: StoryInsert }> = [];
  capped.forEach((story, i) => {
    const index = i === 0 ? 0 : floorLineIndex(timestampToSeconds(story.startTime));
    if (index > (chosen[chosen.length - 1]?.index ?? -1)) chosen.push({ index, story });
  });

  const lastCappedEnd = timestampToSeconds(capped[capped.length - 1].endTime);
  const lastEndSeconds = Math.max(lastCappedEnd, lineSeconds[chosen[chosen.length - 1].index] + 1);

  return chosen.map(({ index, story }, i) => ({
    ...story,
    startTime: lines[index],
    endTime: i < chosen.length - 1 ? lines[chosen[i + 1].index] : secondsToTimestamp(lastEndSeconds),
  }));
}

export type IDetectStoriesUseCase = ReturnType<typeof detectStoriesUseCase>;

export const detectStoriesUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    transcriptsRepository: ITranscriptsRepository,
    storiesRepository: IStoriesRepository,
    storySegmentationService: IStorySegmentationService,
    mediaProcessorService: IMediaProcessorService,
  ) =>
  (broadcastId: string): Promise<StageResult<Story[]>> => {
    return instrumentationService.startSpan({ name: 'detectStories Use Case', op: 'function' }, async () => {
      const broadcast = await requireBroadcastById(broadcastsRepository, broadcastId);

      const existing = await storiesRepository.getStories(broadcast.id);
      if (existing.length > 0) return { data: existing, cached: true };

      return singleFlight(`stories:${broadcast.id}`, async () => {
        const cached = await storiesRepository.getStories(broadcast.id);
        if (cached.length > 0) return { data: cached, cached: true };

        const transcript = await transcriptsRepository.getTranscript(broadcast.id);
        if (!transcript) {
          throw new NotFoundError(`No transcript found for ${broadcast.filename}. Run the transcribe stage first.`);
        }

        const [stories, durationSeconds] = await Promise.all([
          storySegmentationService.segmentTranscript(transcript.text),
          mediaProcessorService.durationSeconds(broadcast.filename),
        ]);

        // Generated data failing entity validation is deterministic — the same
        // output would fail again — so surface it as a fatal InputParseError
        // rather than a plain Error the workflow would burn retries on.
        // Validate the raw segmentation output before clamping: the clamp
        // re-emits timestamps through the canonical formatter, which would
        // silently launder malformed model output the schema exists to reject.
        const parsed = z.array(insertStorySchema).safeParse(stories);
        if (parsed.error) throw new InputParseError('Generated stories failed validation', { cause: parsed.error });

        const saved = await storiesRepository.replaceStories(
          broadcast.id,
          snapStoriesToTranscript(parsed.data, transcript.text, durationSeconds),
        );
        return { data: saved, cached: false };
      });
    });
  };
