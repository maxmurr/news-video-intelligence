import type { IStorySegmentationService } from '@/src/application/services/story-segmentation.service.interface';
import type { StoryInsert } from '@/src/entities/models/story';

export class MockStorySegmentationService implements IStorySegmentationService {
  async segmentTranscript(): Promise<StoryInsert[]> {
    return [
      { title: 'Wildfires', summary: 'Wildfires spread across the state.', startTime: '00:00', endTime: '05:00' },
      // Ends past MockMediaProcessorService's 600s duration, mirroring ASR
      // timestamp drift, so tests cover the detect-stories duration clamp.
      { title: 'Elections', summary: 'Local election results are in.', startTime: '05:00', endTime: '10:30' },
      // Lies entirely past the duration — a hallucinated story detect-stories
      // must drop rather than collapse to a zero-length span.
      { title: 'Phantom', summary: 'Hallucinated trailing segment.', startTime: '10:05', endTime: '10:30' },
    ];
  }
}
