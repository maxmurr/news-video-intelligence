import { asc, cosineDistance, eq, sql } from 'drizzle-orm';

import { db, Transaction } from '@/drizzle';
import { transcriptChunks } from '@/drizzle/schema';
import type { ITranscriptChunksRepository } from '@/src/application/repositories/transcript-chunks.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type {
  TranscriptChunk,
  TranscriptChunkHit,
  TranscriptChunkInsert,
} from '@/src/entities/models/transcript-chunk';

const READ_COLUMNS = { embedding: false } as const;

export class TranscriptChunksRepository implements ITranscriptChunksRepository {
  constructor(
    private readonly instrumentationService: IInstrumentationService,
    private readonly crashReporterService: ICrashReporterService,
  ) {}

  async replaceChunks(broadcastId: string, items: TranscriptChunkInsert[]): Promise<TranscriptChunk[]> {
    return this.instrumentationService.startSpan({ name: 'TranscriptChunksRepository > replaceChunks' }, async () => {
      try {
        const run = async (invoker: Transaction): Promise<TranscriptChunk[]> => {
          await invoker.delete(transcriptChunks).where(eq(transcriptChunks.broadcastId, broadcastId));
          if (items.length === 0) return [];

          const rows = items.map((item, idx) => ({ broadcastId, idx, ...item }));
          const query = invoker.insert(transcriptChunks).values(rows).returning({
            id: transcriptChunks.id,
            broadcastId: transcriptChunks.broadcastId,
            idx: transcriptChunks.idx,
            startTime: transcriptChunks.startTime,
            endTime: transcriptChunks.endTime,
            content: transcriptChunks.content,
            tokenCount: transcriptChunks.tokenCount,
            createdAt: transcriptChunks.createdAt,
          });

          return this.instrumentationService.startSpan(
            { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'postgresql' } },
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

  async searchByVector(queryEmbedding: number[], limit: number): Promise<TranscriptChunkHit[]> {
    return this.instrumentationService.startSpan({ name: 'TranscriptChunksRepository > searchByVector' }, async () => {
      try {
        const distance = cosineDistance(transcriptChunks.embedding, queryEmbedding);
        const query = db
          .select({
            id: transcriptChunks.id,
            broadcastId: transcriptChunks.broadcastId,
            idx: transcriptChunks.idx,
            startTime: transcriptChunks.startTime,
            endTime: transcriptChunks.endTime,
            content: transcriptChunks.content,
            similarity: sql<number>`1 - (${distance})`,
          })
          .from(transcriptChunks)
          .orderBy(distance)
          .limit(limit);

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

  async getChunks(broadcastId: string): Promise<TranscriptChunk[]> {
    return this.instrumentationService.startSpan({ name: 'TranscriptChunksRepository > getChunks' }, async () => {
      try {
        const query = db.query.transcriptChunks.findMany({
          where: eq(transcriptChunks.broadcastId, broadcastId),
          columns: READ_COLUMNS,
          orderBy: [asc(transcriptChunks.idx)],
        });

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
}
