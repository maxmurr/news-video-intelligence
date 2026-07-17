import type { Broadcast, BroadcastInsert } from '@/src/entities/models/broadcast';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export interface IBroadcastsRepository {
  createBroadcast(broadcast: BroadcastInsert, tx?: ITransaction): Promise<Broadcast>;
  getBroadcast(id: string): Promise<Broadcast | undefined>;
  getBroadcastByFilename(filename: string): Promise<Broadcast | undefined>;
  getBroadcasts(): Promise<Broadcast[]>;
  deleteBroadcast(id: string, tx?: ITransaction): Promise<void>;
}
