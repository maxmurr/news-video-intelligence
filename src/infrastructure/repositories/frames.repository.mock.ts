import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { Frame, FrameInsert } from '@/src/entities/models/frame';

export class MockFramesRepository implements IFramesRepository {
  private frames: Frame[] = [];

  async replaceFrames(broadcastId: string, items: FrameInsert[]): Promise<Frame[]> {
    this.frames = this.frames.filter(frame => frame.broadcastId !== broadcastId);
    const now = new Date();
    const created: Frame[] = items.map((item, idx) => ({
      id: crypto.randomUUID(),
      broadcastId,
      idx,
      ...item,
      createdAt: now,
    }));
    this.frames.push(...created);
    return created;
  }

  async getFrames(broadcastId: string): Promise<Frame[]> {
    return this.frames.filter(frame => frame.broadcastId === broadcastId).sort((a, b) => a.idx - b.idx);
  }

  async deleteFrames(broadcastId: string): Promise<void> {
    this.frames = this.frames.filter(frame => frame.broadcastId !== broadcastId);
  }
}
