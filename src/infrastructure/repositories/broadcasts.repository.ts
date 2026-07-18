import { desc, eq } from 'drizzle-orm';

import { db } from '@/drizzle';
import { broadcasts } from '@/drizzle/schema';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { DatabaseOperationError, NotFoundError } from '@/src/entities/errors/common';
import type { Broadcast, BroadcastInsert } from '@/src/entities/models/broadcast';

export class BroadcastsRepository implements IBroadcastsRepository {
  constructor(
    private readonly instrumentationService: IInstrumentationService,
    private readonly crashReporterService: ICrashReporterService,
  ) {}

  async createBroadcast(broadcast: BroadcastInsert): Promise<Broadcast> {
    return this.instrumentationService.startSpan({ name: 'BroadcastsRepository > createBroadcast' }, async () => {
      try {
        const query = db.insert(broadcasts).values(broadcast).returning();

        const [created] = await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'postgresql' } },
          () => query.execute(),
        );

        if (!created) throw new DatabaseOperationError('Cannot create broadcast');
        return created;
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async getBroadcast(id: string): Promise<Broadcast | undefined> {
    return this.instrumentationService.startSpan({ name: 'BroadcastsRepository > getBroadcast' }, async () => {
      try {
        const query = db.query.broadcasts.findFirst({ where: eq(broadcasts.id, id) });

        return await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'postgresql' } },
          () => query.execute(),
        );
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async getBroadcastByFilename(filename: string): Promise<Broadcast | undefined> {
    return this.instrumentationService.startSpan(
      { name: 'BroadcastsRepository > getBroadcastByFilename' },
      async () => {
        try {
          const query = db.query.broadcasts.findFirst({ where: eq(broadcasts.filename, filename) });

          return await this.instrumentationService.startSpan(
            { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'postgresql' } },
            () => query.execute(),
          );
        } catch (err) {
          this.crashReporterService.report(err);
          throw err;
        }
      },
    );
  }

  async getBroadcasts(): Promise<Broadcast[]> {
    return this.instrumentationService.startSpan({ name: 'BroadcastsRepository > getBroadcasts' }, async () => {
      try {
        const query = db.query.broadcasts.findMany({ orderBy: [desc(broadcasts.uploadedAt)] });

        return await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'postgresql' } },
          () => query.execute(),
        );
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async deleteBroadcast(id: string): Promise<void> {
    await this.instrumentationService.startSpan({ name: 'BroadcastsRepository > deleteBroadcast' }, async () => {
      try {
        const query = db.delete(broadcasts).where(eq(broadcasts.id, id)).returning();

        const [deleted] = await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'postgresql' } },
          () => query.execute(),
        );

        if (!deleted) throw new NotFoundError('Broadcast not found');
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }
}
