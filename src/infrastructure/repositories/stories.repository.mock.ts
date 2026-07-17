import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { Story, StoryInsert } from '@/src/entities/models/story';

export class MockStoriesRepository implements IStoriesRepository {
  private stories: Story[] = [];

  async replaceStories(broadcastId: string, items: StoryInsert[]): Promise<Story[]> {
    this.stories = this.stories.filter(story => story.broadcastId !== broadcastId);
    const now = new Date();
    const created: Story[] = items.map((item, idx) => ({
      id: crypto.randomUUID(),
      broadcastId,
      idx,
      ...item,
      createdAt: now,
    }));
    this.stories.push(...created);
    return created;
  }

  async getStories(broadcastId: string): Promise<Story[]> {
    return this.stories.filter(story => story.broadcastId === broadcastId).sort((a, b) => a.idx - b.idx);
  }

  async deleteStories(broadcastId: string): Promise<void> {
    this.stories = this.stories.filter(story => story.broadcastId !== broadcastId);
  }
}
