import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Frame } from '@/src/entities/models/frame';

export type IGetFramesUseCase = ReturnType<typeof getFramesUseCase>;

export const getFramesUseCase =
  (instrumentationService: IInstrumentationService, framesRepository: IFramesRepository) =>
  (broadcastId: string): Promise<Frame[]> => {
    return instrumentationService.startSpan({ name: 'getFrames Use Case', op: 'function' }, async () => {
      return framesRepository.getFrames(broadcastId);
    });
  };
