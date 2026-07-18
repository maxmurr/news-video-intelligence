import type {
  HeadlineCopy,
  IHeadlineWriterService,
} from '@/src/application/services/headline-writer.service.interface';
import type { Story } from '@/src/entities/models/story';

export class MockHeadlineWriterService implements IHeadlineWriterService {
  async writeHeadlines(stories: Story[]): Promise<HeadlineCopy[]> {
    return stories.map(story => ({
      headline: `${story.title} Headline`,
      summary: `${story.summary} Grounded in the segment transcript and nothing else.`,
    }));
  }
}
