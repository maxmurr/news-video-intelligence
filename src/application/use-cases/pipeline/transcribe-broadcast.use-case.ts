import { clampTranscriptToDuration, lineTimestamp, normalizeTranscript } from '@/lib/timestamps';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import type { ITranscriptionService } from '@/src/application/services/transcription.service.interface';
import type { Transcript } from '@/src/entities/models/transcript';
import { requireBroadcastById, singleFlight, type StageResult } from './shared';

const MAX_TRANSCRIBE_ATTEMPTS = 3;

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

      return singleFlight(`transcribe:${broadcast.id}`, async () => {
        const cached = await transcriptsRepository.getTranscript(broadcast.id);
        if (cached) return { data: cached, cached: true };

        const audio = await mediaProcessorService.extractSpeechAudio(broadcast.filename);
        // A failed duration probe must not sink a successful transcription: the
        // clamp is an enhancement, and 0 makes it a no-op (same as pre-change).
        const durationPromise = mediaProcessorService.durationSeconds(broadcast.filename).catch(() => 0);

        // The ASR model intermittently returns an empty or preamble-only
        // response. Regenerate from the same audio a few times before giving up,
        // so one bad draw doesn't fail the step. The final throw stays a plain
        // Error, which the workflow still treats as retryable.
        let text = '';
        for (let attempt = 1; ; attempt++) {
          text = normalizeTranscript(await transcriptionService.transcribeAudio(audio)).trim();
          if (isValidTranscript(text)) break;
          if (attempt >= MAX_TRANSCRIBE_ATTEMPTS) {
            throw new Error(
              `Transcript for ${broadcast.filename} did not start with a timestamp after ` +
                `${MAX_TRANSCRIBE_ATTEMPTS} attempts. Got: ${text.slice(0, 80)}`,
            );
          }
        }

        const durationSeconds = await durationPromise;

        // Validate before clamping: clamping a refusal would just truncate garbage.
        // The clamp drops ASR-hallucinated lines past the real end so they never
        // reach the transcript UI, story segmentation, embeddings, or citations.
        const saved = await transcriptsRepository.saveTranscript({
          broadcastId: broadcast.id,
          text: clampTranscriptToDuration(text, durationSeconds),
        });
        return { data: saved, cached: false };
      });
    });
  };
