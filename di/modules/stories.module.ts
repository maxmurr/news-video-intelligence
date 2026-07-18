import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { StoriesRepository } from '@/src/infrastructure/repositories/stories.repository';
import { MockStoriesRepository } from '@/src/infrastructure/repositories/stories.repository.mock';

export function createStoriesModule() {
  const storiesModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    storiesModule.bind(DI_SYMBOLS.IStoriesRepository).toClass(MockStoriesRepository);
  } else {
    storiesModule
      .bind(DI_SYMBOLS.IStoriesRepository)
      .toClass(StoriesRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  return storiesModule;
}
