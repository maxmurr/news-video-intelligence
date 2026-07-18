import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Broadcast } from '@/src/entities/models/broadcast';

export type IGetBroadcastByIdUseCase = ReturnType<typeof getBroadcastByIdUseCase>;

/**
 * Raw row lookup by public id. Absence is a normal answer here (the client
 * may hold a stale id), so this returns undefined rather than throwing — the
 * caller decides whether a miss is a 404.
 */
export const getBroadcastByIdUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (broadcastId: string): Promise<Broadcast | undefined> => {
    return instrumentationService.startSpan({ name: 'getBroadcastById Use Case', op: 'function' }, async () => {
      return broadcastsRepository.getBroadcast(broadcastId);
    });
  };
