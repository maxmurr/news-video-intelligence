import type { Story, StoryInsert } from '@/src/entities/models/story';

export interface IStoriesRepository {
  /** Replaces every story for a broadcast with `items`, in order. Atomic. */
  replaceStories(broadcastId: string, items: StoryInsert[]): Promise<Story[]>;
  getStories(broadcastId: string): Promise<Story[]>;
}
