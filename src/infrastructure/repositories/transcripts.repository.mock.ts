import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { Transcript, TranscriptInsert } from '@/src/entities/models/transcript';

export class MockTranscriptsRepository implements ITranscriptsRepository {
  private transcripts: Transcript[] = [];

  async saveTranscript(transcript: TranscriptInsert): Promise<Transcript> {
    const now = new Date();
    const existing = this.transcripts.find(item => item.broadcastId === transcript.broadcastId);
    if (existing) {
      existing.text = transcript.text;
      existing.updatedAt = now;
      return existing;
    }
    const created: Transcript = {
      id: crypto.randomUUID(),
      ...transcript,
      createdAt: now,
      updatedAt: now,
    };
    this.transcripts.push(created);
    return created;
  }

  async getTranscript(broadcastId: string): Promise<Transcript | undefined> {
    return this.transcripts.find(item => item.broadcastId === broadcastId);
  }

  async deleteTranscript(broadcastId: string): Promise<void> {
    this.transcripts = this.transcripts.filter(item => item.broadcastId !== broadcastId);
  }
}
