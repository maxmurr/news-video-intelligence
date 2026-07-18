import { asc, eq } from 'drizzle-orm';

import { db, Transaction } from '@/drizzle';
import { stories } from '@/drizzle/schema';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Story, StoryInsert } from '@/src/entities/models/story';

export class StoriesRepository implements IStoriesRepository {
  constructor(
    private readonly instrumentationService: IInstrumentationService,
    private readonly crashReporterService: ICrashReporterService,
  ) {}

  async replaceStories(broadcastId: string, items: StoryInsert[]): Promise<Story[]> {
    return this.instrumentationService.startSpan({ name: 'StoriesRepository > replaceStories' }, async () => {
      try {
        const run = async (invoker: Transaction): Promise<Story[]> => {
          await invoker.delete(stories).where(eq(stories.broadcastId, broadcastId));
          if (items.length === 0) return [];

          const rows = items.map((item, idx) => ({ broadcastId, idx, ...item }));
          const query = invoker.insert(stories).values(rows).returning();

          return this.instrumentationService.startSpan(
            { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'sqlite' } },
            () => query.execute(),
          );
        };

        return db.transaction(run);
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async getStories(broadcastId: string): Promise<Story[]> {
    return this.instrumentationService.startSpan({ name: 'StoriesRepository > getStories' }, async () => {
      try {
        const query = db.query.stories.findMany({
          where: eq(stories.broadcastId, broadcastId),
          orderBy: [asc(stories.idx)],
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
}
