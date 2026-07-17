import type { Story, StoryInsert } from '@/src/entities/models/story';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export interface IStoriesRepository {
  /** Replaces every story for a broadcast with `items`, in order. Atomic. */
  replaceStories(broadcastId: string, items: StoryInsert[], tx?: ITransaction): Promise<Story[]>;
  getStories(broadcastId: string): Promise<Story[]>;
  deleteStories(broadcastId: string, tx?: ITransaction): Promise<void>;
}
