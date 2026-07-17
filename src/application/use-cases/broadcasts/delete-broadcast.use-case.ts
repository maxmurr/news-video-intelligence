import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export type IDeleteBroadcastUseCase = ReturnType<typeof deleteBroadcastUseCase>;

export const deleteBroadcastUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (id: string, tx?: ITransaction): Promise<void> => {
    return instrumentationService.startSpan({ name: 'deleteBroadcast Use Case', op: 'function' }, async () => {
      return broadcastsRepository.deleteBroadcast(id, tx);
    });
  };
