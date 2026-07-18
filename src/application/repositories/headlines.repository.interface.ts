import type { Headline, HeadlineInsert } from '@/src/entities/models/headline';

export interface IHeadlinesRepository {
  /** Replaces every headline for a broadcast with `items`, in order. Atomic. */
  replaceHeadlines(broadcastId: string, items: HeadlineInsert[]): Promise<Headline[]>;
  getHeadlines(broadcastId: string): Promise<Headline[]>;
  /** The idx-0 headline of each listed broadcast; broadcasts without one are omitted. */
  getTopHeadlines(broadcastIds: string[]): Promise<{ broadcastId: string; headline: string }[]>;
}
