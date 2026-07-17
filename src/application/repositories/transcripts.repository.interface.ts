import type { ITransaction } from '@/src/entities/models/transaction.interface';
import type { Transcript, TranscriptInsert } from '@/src/entities/models/transcript';

export interface ITranscriptsRepository {
  saveTranscript(transcript: TranscriptInsert, tx?: ITransaction): Promise<Transcript>;
  getTranscript(broadcastId: string): Promise<Transcript | undefined>;
  deleteTranscript(broadcastId: string, tx?: ITransaction): Promise<void>;
}
