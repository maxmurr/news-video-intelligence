import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Frame, FrameInsert } from '@/src/entities/models/frame';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export type IReplaceFramesUseCase = ReturnType<typeof replaceFramesUseCase>;

export const replaceFramesUseCase =
  (instrumentationService: IInstrumentationService, framesRepository: IFramesRepository) =>
  (broadcastId: string, items: FrameInsert[], tx?: ITransaction): Promise<Frame[]> => {
    return instrumentationService.startSpan({ name: 'replaceFrames Use Case', op: 'function' }, async () => {
      return framesRepository.replaceFrames(broadcastId, items, tx);
    });
  };
