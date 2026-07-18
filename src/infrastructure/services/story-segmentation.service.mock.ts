import type { IStorySegmentationService } from '@/src/application/services/story-segmentation.service.interface';
import type { StoryInsert } from '@/src/entities/models/story';

export class MockStorySegmentationService implements IStorySegmentationService {
  async segmentTranscript(): Promise<StoryInsert[]> {
    return [
      { title: 'Wildfires', summary: 'Wildfires spread across the state.', startTime: '00:00', endTime: '05:00' },
      { title: 'Elections', summary: 'Local election results are in.', startTime: '05:00', endTime: '10:00' },
    ];
  }
}
