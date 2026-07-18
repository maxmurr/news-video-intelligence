import type { Transcript, TranscriptInsert } from '@/src/entities/models/transcript';

export interface ITranscriptsRepository {
  /** Upserts the one transcript a broadcast has. */
  saveTranscript(transcript: TranscriptInsert): Promise<Transcript>;
  getTranscript(broadcastId: string): Promise<Transcript | undefined>;
}
