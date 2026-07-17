import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Broadcast } from '@/src/entities/models/broadcast';

export type IGetBroadcastByFilenameUseCase = ReturnType<typeof getBroadcastByFilenameUseCase>;

/**
 * Filename is the broadcast's natural key everywhere upstream. Absence is a
 * normal answer here (the upload may not exist), so this returns undefined
 * rather than throwing — the caller decides whether a miss is a 404.
 */
export const getBroadcastByFilenameUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (filename: string): Promise<Broadcast | undefined> => {
    return instrumentationService.startSpan({ name: 'getBroadcastByFilename Use Case', op: 'function' }, async () => {
      return broadcastsRepository.getBroadcastByFilename(filename);
    });
  };
