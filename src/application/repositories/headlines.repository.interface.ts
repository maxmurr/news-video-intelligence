import type { Headline, HeadlineInsert } from '@/src/entities/models/headline';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export interface IHeadlinesRepository {
  /** Replaces every headline for a broadcast with `items`, in order. Atomic. */
  replaceHeadlines(broadcastId: string, items: HeadlineInsert[], tx?: ITransaction): Promise<Headline[]>;
  getHeadlines(broadcastId: string): Promise<Headline[]>;
  deleteHeadlines(broadcastId: string, tx?: ITransaction): Promise<void>;
}
