import { clampTranscriptToDuration, lineTimestamp, normalizeTranscript } from '@/lib/timestamps';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import type { ITranscriptionService } from '@/src/application/services/transcription.service.interface';
import type { Transcript } from '@/src/entities/models/transcript';
import { requireBroadcastById, type StageResult } from './shared';

/**
 * A transcript must start with a timestamp; anything else is a refusal or
 * preamble that would poison every downstream stage if cached.
 */
export function isValidTranscript(text: string): boolean {
  return lineTimestamp(text.trim()) !== null;
}

export type ITranscribeBroadcastUseCase = ReturnType<typeof transcribeBroadcastUseCase>;

export const transcribeBroadcastUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    transcriptsRepository: ITranscriptsRepository,
    mediaProcessorService: IMediaProcessorService,
    transcriptionService: ITranscriptionService,
  ) =>
  (broadcastId: string): Promise<StageResult<Transcript>> => {
    return instrumentationService.startSpan({ name: 'transcribeBroadcast Use Case', op: 'function' }, async () => {
      const broadcast = await requireBroadcastById(broadcastsRepository, broadcastId);

      const existing = await transcriptsRepository.getTranscript(broadcast.id);
      if (existing) return { data: existing, cached: true };

      const audio = await mediaProcessorService.extractSpeechAudio(broadcast.filename);
      // A failed duration probe must not sink a successful transcription: the
      // clamp is an enhancement, and 0 makes it a no-op (same as pre-change).
      const [rawTranscript, durationSeconds] = await Promise.all([
        transcriptionService.transcribeAudio(audio),
        mediaProcessorService.durationSeconds(broadcast.filename).catch(() => 0),
      ]);
      const text = normalizeTranscript(rawTranscript).trim();

      if (!isValidTranscript(text)) {
        throw new Error(
          `Transcript for ${broadcast.filename} does not start with a timestamp. Got: ${text.slice(0, 80)}`,
        );
      }

      // Validate before clamping: clamping a refusal would just truncate garbage.
      // The clamp drops ASR-hallucinated lines past the real end so they never
      // reach the transcript UI, story segmentation, embeddings, or citations.
      const saved = await transcriptsRepository.saveTranscript({
        broadcastId: broadcast.id,
        text: clampTranscriptToDuration(text, durationSeconds),
      });
      return { data: saved, cached: false };
    });
  };
