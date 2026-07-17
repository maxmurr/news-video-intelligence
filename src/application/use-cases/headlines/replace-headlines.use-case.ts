import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Headline, HeadlineInsert } from '@/src/entities/models/headline';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export type IReplaceHeadlinesUseCase = ReturnType<typeof replaceHeadlinesUseCase>;

export const replaceHeadlinesUseCase =
  (instrumentationService: IInstrumentationService, headlinesRepository: IHeadlinesRepository) =>
  (broadcastId: string, items: HeadlineInsert[], tx?: ITransaction): Promise<Headline[]> => {
    return instrumentationService.startSpan({ name: 'replaceHeadlines Use Case', op: 'function' }, async () => {
      return headlinesRepository.replaceHeadlines(broadcastId, items, tx);
    });
  };
