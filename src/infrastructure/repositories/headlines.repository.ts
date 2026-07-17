import { asc, eq } from 'drizzle-orm';

import { db, Transaction } from '@/drizzle';
import { headlines } from '@/drizzle/schema';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Headline, HeadlineInsert } from '@/src/entities/models/headline';

export class HeadlinesRepository implements IHeadlinesRepository {
  constructor(
    private readonly instrumentationService: IInstrumentationService,
    private readonly crashReporterService: ICrashReporterService,
  ) {}

  async replaceHeadlines(broadcastId: string, items: HeadlineInsert[], tx?: Transaction): Promise<Headline[]> {
    return this.instrumentationService.startSpan({ name: 'HeadlinesRepository > replaceHeadlines' }, async () => {
      try {
        const run = async (invoker: Transaction): Promise<Headline[]> => {
          await invoker.delete(headlines).where(eq(headlines.broadcastId, broadcastId));
          if (items.length === 0) return [];

          const rows = items.map((item, idx) => ({ broadcastId, idx, ...item }));
          const query = invoker.insert(headlines).values(rows).returning();

          return this.instrumentationService.startSpan(
            { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'sqlite' } },
            () => query.execute(),
          );
        };

        return tx ? run(tx) : db.transaction(run);
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async getHeadlines(broadcastId: string): Promise<Headline[]> {
    return this.instrumentationService.startSpan({ name: 'HeadlinesRepository > getHeadlines' }, async () => {
      try {
        const query = db.query.headlines.findMany({
          where: eq(headlines.broadcastId, broadcastId),
          orderBy: [asc(headlines.idx)],
        });

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

  async deleteHeadlines(broadcastId: string, tx?: Transaction): Promise<void> {
    const invoker = tx ?? db;

    await this.instrumentationService.startSpan({ name: 'HeadlinesRepository > deleteHeadlines' }, async () => {
      try {
        const query = invoker.delete(headlines).where(eq(headlines.broadcastId, broadcastId));

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
