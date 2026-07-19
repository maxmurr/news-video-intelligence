import type { StoryInsert } from '@/src/entities/models/story';

export interface IStorySegmentationService {
  segmentTranscript(transcript: string): Promise<StoryInsert[]>;
}
