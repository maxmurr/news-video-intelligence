import type { Frame, FrameInsert } from '@/src/entities/models/frame';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export interface IFramesRepository {
  /** Replaces every frame for a broadcast with `items`, in order. Atomic. */
  replaceFrames(broadcastId: string, items: FrameInsert[], tx?: ITransaction): Promise<Frame[]>;
  getFrames(broadcastId: string): Promise<Frame[]>;
  deleteFrames(broadcastId: string, tx?: ITransaction): Promise<void>;
}
