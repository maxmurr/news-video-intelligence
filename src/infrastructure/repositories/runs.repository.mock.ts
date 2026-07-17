import type { IRunsRepository } from '@/src/application/repositories/runs.repository.interface';
import type { Run, RunInsert } from '@/src/entities/models/run';

export class MockRunsRepository implements IRunsRepository {
  private runs: Run[] = [];

  async saveRun(run: RunInsert): Promise<Run> {
    const now = new Date();
    const existing = this.runs.find(item => item.broadcastId === run.broadcastId);
    if (existing) {
      existing.runId = run.runId;
      existing.startedAt = now;
      existing.updatedAt = now;
      return existing;
    }
    const created: Run = {
      id: crypto.randomUUID(),
      ...run,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.runs.push(created);
    return created;
  }

  async getRun(broadcastId: string): Promise<Run | undefined> {
    return this.runs.find(item => item.broadcastId === broadcastId);
  }

  async deleteRun(broadcastId: string): Promise<void> {
    this.runs = this.runs.filter(item => item.broadcastId !== broadcastId);
  }
}
