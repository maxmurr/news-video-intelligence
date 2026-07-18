import type { Broadcast, BroadcastInsert } from '@/src/entities/models/broadcast';

export interface IBroadcastsRepository {
  createBroadcast(broadcast: BroadcastInsert): Promise<Broadcast>;
  getBroadcast(id: string): Promise<Broadcast | undefined>;
  getBroadcastByFilename(filename: string): Promise<Broadcast | undefined>;
  /** All broadcasts, newest upload first. */
  getBroadcasts(): Promise<Broadcast[]>;
  /** Deletes the broadcast row; child rows cascade at the database level. */
  deleteBroadcast(id: string): Promise<void>;
}
