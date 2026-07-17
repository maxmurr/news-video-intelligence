import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Story, StoryInsert } from '@/src/entities/models/story';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export type IReplaceStoriesUseCase = ReturnType<typeof replaceStoriesUseCase>;

export const replaceStoriesUseCase =
  (instrumentationService: IInstrumentationService, storiesRepository: IStoriesRepository) =>
  (broadcastId: string, items: StoryInsert[], tx?: ITransaction): Promise<Story[]> => {
    return instrumentationService.startSpan({ name: 'replaceStories Use Case', op: 'function' }, async () => {
      return storiesRepository.replaceStories(broadcastId, items, tx);
    });
  };
