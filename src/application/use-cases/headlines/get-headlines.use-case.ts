import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Headline } from '@/src/entities/models/headline';

export type IGetHeadlinesUseCase = ReturnType<typeof getHeadlinesUseCase>;

export const getHeadlinesUseCase =
  (instrumentationService: IInstrumentationService, headlinesRepository: IHeadlinesRepository) =>
  (broadcastId: string): Promise<Headline[]> => {
    return instrumentationService.startSpan({ name: 'getHeadlines Use Case', op: 'function' }, async () => {
      return headlinesRepository.getHeadlines(broadcastId);
    });
  };
