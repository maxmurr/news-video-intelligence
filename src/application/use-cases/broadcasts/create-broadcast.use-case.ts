import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Broadcast, BroadcastInsert } from '@/src/entities/models/broadcast';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export type ICreateBroadcastUseCase = ReturnType<typeof createBroadcastUseCase>;

export const createBroadcastUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (input: BroadcastInsert, tx?: ITransaction): Promise<Broadcast> => {
    return instrumentationService.startSpan({ name: 'createBroadcast Use Case', op: 'function' }, async () => {
      return broadcastsRepository.createBroadcast(input, tx);
    });
  };
