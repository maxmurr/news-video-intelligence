import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Broadcast } from '@/src/entities/models/broadcast';

export type IGetBroadcastUseCase = ReturnType<typeof getBroadcastUseCase>;

export const getBroadcastUseCase =
  (instrumentationService: IInstrumentationService, broadcastsRepository: IBroadcastsRepository) =>
  (id: string): Promise<Broadcast> => {
    return instrumentationService.startSpan({ name: 'getBroadcast Use Case', op: 'function' }, async () => {
      const broadcast = await broadcastsRepository.getBroadcast(id);
      if (!broadcast) throw new NotFoundError('Broadcast not found');
      return broadcast;
    });
  };
