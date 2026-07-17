import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ITransaction } from '@/src/entities/models/transaction.interface';
import type { Transcript, TranscriptInsert } from '@/src/entities/models/transcript';

export type ISaveTranscriptUseCase = ReturnType<typeof saveTranscriptUseCase>;

export const saveTranscriptUseCase =
  (instrumentationService: IInstrumentationService, transcriptsRepository: ITranscriptsRepository) =>
  (input: TranscriptInsert, tx?: ITransaction): Promise<Transcript> => {
    return instrumentationService.startSpan({ name: 'saveTranscript Use Case', op: 'function' }, async () => {
      return transcriptsRepository.saveTranscript(input, tx);
    });
  };
