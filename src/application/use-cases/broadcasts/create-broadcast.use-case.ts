import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Broadcast, BroadcastInsert } from '@/src/entities/models/broadcast';

export type ICreateBroadcastUseCase = ReturnType<typeof createBroadcastUseCase>;

export const createBroadcastUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (input: BroadcastInsert): Promise<Broadcast> => {
    return instrumentationService.startSpan({ name: 'createBroadcast Use Case', op: 'function' }, async () => {
      return broadcastsRepository.createBroadcast(input);
    });
  };
