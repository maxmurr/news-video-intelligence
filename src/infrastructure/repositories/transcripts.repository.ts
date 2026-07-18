import { eq } from 'drizzle-orm';

import { db } from '@/drizzle';
import { transcripts } from '@/drizzle/schema';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { DatabaseOperationError } from '@/src/entities/errors/common';
import type { Transcript, TranscriptInsert } from '@/src/entities/models/transcript';

export class TranscriptsRepository implements ITranscriptsRepository {
  constructor(
    private readonly instrumentationService: IInstrumentationService,
    private readonly crashReporterService: ICrashReporterService,
  ) {}

  async saveTranscript(transcript: TranscriptInsert): Promise<Transcript> {
    return this.instrumentationService.startSpan({ name: 'TranscriptsRepository > saveTranscript' }, async () => {
      try {
        const query = db
          .insert(transcripts)
          .values(transcript)
          .onConflictDoUpdate({
            target: transcripts.broadcastId,
            set: { text: transcript.text, updatedAt: new Date() },
          })
          .returning();

        const [saved] = await this.instrumentationService.startSpan(
          { name: query.toSQL().sql, op: 'db.query', attributes: { 'db.system': 'postgresql' } },
          () => query.execute(),
        );

        if (!saved) throw new DatabaseOperationError('Cannot save transcript');
        return saved;
      } catch (err) {
        this.crashReporterService.report(err);
        throw err;
      }
    });
  }

  async getTranscript(broadcastId: string): Promise<Transcript | undefined> {
    return this.instrumentationService.startSpan({ name: 'TranscriptsRepository > getTranscript' }, async () => {
      try {
        const query = db.query.transcripts.findFirst({ where: eq(transcripts.broadcastId, broadcastId) });

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
