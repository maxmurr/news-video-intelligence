import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Broadcast } from '@/src/entities/models/broadcast';

export type IGetBroadcastByFilenameUseCase = ReturnType<typeof getBroadcastByFilenameUseCase>;

/**
 * Filename is internal (storage key); the public identifier is the id. This
 * lookup remains for the local-fixture eval harness, which addresses
 * broadcasts by fixture filename. Absence is a normal answer here, so this
 * returns undefined rather than throwing.
 */
export const getBroadcastByFilenameUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (filename: string): Promise<Broadcast | undefined> => {
    return instrumentationService.startSpan({ name: 'getBroadcastByFilename Use Case', op: 'function' }, async () => {
      return broadcastsRepository.getBroadcastByFilename(filename);
    });
  };
