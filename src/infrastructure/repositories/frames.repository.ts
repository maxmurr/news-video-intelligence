import { asc, eq } from 'drizzle-orm';

import { db, Transaction } from '@/drizzle';
import { frames } from '@/drizzle/schema';
import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Frame, FrameInsert } from '@/src/entities/models/frame';

export class FramesRepository implements IFramesRepository {
  constructor(
    private readonly instrumentationService: IInstrumentationService,
    private readonly crashReporterService: ICrashReporterService,
  ) {}

  async replaceFrames(broadcastId: string, items: FrameInsert[], tx?: Transaction): Promise<Frame[]> {
    return this.instrumentationService.startSpan({ name: 'FramesRepository > replaceFrames' }, async () => {
      try {
        const run = async (invoker: Transaction): Promise<Frame[]> => {
          await invoker.delete(frames).where(eq(frames.broadcastId, broadcastId));
          if (items.length === 0) return [];

          const rows = items.map((item, idx) => ({ broadcastId, idx, ...item }));
          const query = invoker.insert(frames).values(rows).returning();

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

  async getFrames(broadcastId: string): Promise<Frame[]> {
    return this.instrumentationService.startSpan({ name: 'FramesRepository > getFrames' }, async () => {
      try {
        const query = db.query.frames.findMany({
          where: eq(frames.broadcastId, broadcastId),
          orderBy: [asc(frames.idx)],
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

  async deleteFrames(broadcastId: string, tx?: Transaction): Promise<void> {
    const invoker = tx ?? db;

    await this.instrumentationService.startSpan({ name: 'FramesRepository > deleteFrames' }, async () => {
      try {
        const query = invoker.delete(frames).where(eq(frames.broadcastId, broadcastId));

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
