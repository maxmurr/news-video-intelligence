import { lineTimestamp, normalizeTranscript } from '@/lib/timestamps';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import type { ITranscriptionService } from '@/src/application/services/transcription.service.interface';
import type { Transcript } from '@/src/entities/models/transcript';
import { requireBroadcastByFilename, type StageResult } from './shared';

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
  (filename: string): Promise<StageResult<Transcript>> => {
    return instrumentationService.startSpan({ name: 'transcribeBroadcast Use Case', op: 'function' }, async () => {
      const broadcast = await requireBroadcastByFilename(broadcastsRepository, filename);

      const existing = await transcriptsRepository.getTranscript(broadcast.id);
      if (existing) return { data: existing, cached: true };

      const audio = await mediaProcessorService.extractSpeechAudio(filename);
      const text = normalizeTranscript(await transcriptionService.transcribeAudio(audio)).trim();

      // Reject a refusal/preamble as a retryable failure instead of persisting garbage.
      if (!isValidTranscript(text)) {
        throw new Error(`Transcript for ${filename} does not start with a timestamp. Got: ${text.slice(0, 80)}`);
      }

      const saved = await transcriptsRepository.saveTranscript({ broadcastId: broadcast.id, text });
      return { data: saved, cached: false };
    });
  };
