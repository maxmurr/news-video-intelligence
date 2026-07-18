import type { StoryInsert } from '@/src/entities/models/story';

/** Splits a timestamped transcript into contiguous story segments, in order. */
export interface IStorySegmentationService {
  segmentTranscript(transcript: string): Promise<StoryInsert[]>;
}
