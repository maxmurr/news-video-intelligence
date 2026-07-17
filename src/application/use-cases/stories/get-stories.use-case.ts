import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Story } from '@/src/entities/models/story';

export type IGetStoriesUseCase = ReturnType<typeof getStoriesUseCase>;

export const getStoriesUseCase =
  (instrumentationService: IInstrumentationService, storiesRepository: IStoriesRepository) =>
  (broadcastId: string): Promise<Story[]> => {
    return instrumentationService.startSpan({ name: 'getStories Use Case', op: 'function' }, async () => {
      return storiesRepository.getStories(broadcastId);
    });
  };
