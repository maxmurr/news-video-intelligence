import type { Frame, FrameInsert } from '@/src/entities/models/frame';

export interface IFramesRepository {
  /** Replaces every frame for a broadcast with `items`, in order. Atomic. */
  replaceFrames(broadcastId: string, items: FrameInsert[]): Promise<Frame[]>;
  getFrames(broadcastId: string): Promise<Frame[]>;
}
