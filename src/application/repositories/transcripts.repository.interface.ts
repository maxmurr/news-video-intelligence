import type { Transcript, TranscriptInsert } from '@/src/entities/models/transcript';

export interface ITranscriptsRepository {
  saveTranscript(transcript: TranscriptInsert): Promise<Transcript>;
  getTranscript(broadcastId: string): Promise<Transcript | undefined>;
}
