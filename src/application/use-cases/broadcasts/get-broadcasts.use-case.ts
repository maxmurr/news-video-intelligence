import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Broadcast } from '@/src/entities/models/broadcast';

export type IGetBroadcastsUseCase = ReturnType<typeof getBroadcastsUseCase>;

export const getBroadcastsUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (): Promise<Broadcast[]> => {
    return instrumentationService.startSpan({ name: 'getBroadcasts Use Case', op: 'function' }, async () => {
      return broadcastsRepository.getBroadcasts();
    });
  };
