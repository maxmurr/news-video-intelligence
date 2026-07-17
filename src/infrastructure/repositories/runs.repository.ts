import { eq } from 'drizzle-orm';

import { db, Transaction } from '@/drizzle';
import { runs } from '@/drizzle/schema';
import type { IRunsRepository } from '@/src/application/repositories/runs.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { DatabaseOperationError } from '@/src/entities/errors/common';
import type { Run, RunInsert } from '@/src/entities/models/run';

export class RunsRepository implements IRunsRepository {
  constructor(
    private readonly instrumentationService: IInstrumentationService,
    private readonly crashReporterService: ICrashReporterService,
  ) {}

  async saveRun(run: RunInsert, tx?: Transaction): Promise<Run> {
    const invoker = tx ?? db;
    const startedAt = new Date();

    return this.instrumentationService.startSpan({ name: 'RunsRepository > saveRun' }, async () => {
      try {
        const query = invoker
          .insert(runs)
          .values({ ...run, startedAt })
          .onConflictDoUpdate({
            target: runs.broadcastId,
            set: { runId: run.runId, startedAt, updatedAt: new Date() },
          })
          .returning();

        const [saved] = await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'sqlite' } },
          () => query.execute(),
        );

        if (!saved) throw new DatabaseOperationError('Cannot save run');
        return saved;
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async getRun(broadcastId: string): Promise<Run | undefined> {
    return this.instrumentationService.startSpan({ name: 'RunsRepository > getRun' }, async () => {
      try {
        const query = db.query.runs.findFirst({ where: eq(runs.broadcastId, broadcastId) });

        return await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'sqlite' } },
          () => query.execute(),
        );
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async deleteRun(broadcastId: string, tx?: Transaction): Promise<void> {
    const invoker = tx ?? db;

    await this.instrumentationService.startSpan({ name: 'RunsRepository > deleteRun' }, async () => {
      try {
        const query = invoker.delete(runs).where(eq(runs.broadcastId, broadcastId));

        await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'sqlite' } },
          () => query.execute(),
        );
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }
}
