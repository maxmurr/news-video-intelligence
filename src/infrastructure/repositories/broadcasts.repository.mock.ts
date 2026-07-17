import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Broadcast, BroadcastInsert } from '@/src/entities/models/broadcast';

export class MockBroadcastsRepository implements IBroadcastsRepository {
  private broadcasts: Broadcast[] = [];

  async createBroadcast(broadcast: BroadcastInsert): Promise<Broadcast> {
    const now = new Date();
    const created: Broadcast = {
      id: crypto.randomUUID(),
      ...broadcast,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.broadcasts.push(created);
    return created;
  }

  async getBroadcast(id: string): Promise<Broadcast | undefined> {
    return this.broadcasts.find(broadcast => broadcast.id === id);
  }

  async getBroadcastByFilename(filename: string): Promise<Broadcast | undefined> {
    return this.broadcasts.find(broadcast => broadcast.filename === filename);
  }

  async getBroadcasts(): Promise<Broadcast[]> {
    return [...this.broadcasts].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async deleteBroadcast(id: string): Promise<void> {
    const index = this.broadcasts.findIndex(broadcast => broadcast.id === id);
    if (index === -1) throw new NotFoundError('Broadcast not found');
    this.broadcasts.splice(index, 1);
  }
}
