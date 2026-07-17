import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Transcript } from '@/src/entities/models/transcript';

export type IGetTranscriptUseCase = ReturnType<typeof getTranscriptUseCase>;

/** Undefined while the broadcast is still being transcribed — a normal state. */
export const getTranscriptUseCase =
  (instrumentationService: IInstrumentationService, transcriptsRepository: ITranscriptsRepository) =>
  (broadcastId: string): Promise<Transcript | undefined> => {
    return instrumentationService.startSpan({ name: 'getTranscript Use Case', op: 'function' }, async () => {
      return transcriptsRepository.getTranscript(broadcastId);
    });
  };
