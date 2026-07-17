import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { getStoriesUseCase } from '@/src/application/use-cases/stories/get-stories.use-case';
import { replaceStoriesUseCase } from '@/src/application/use-cases/stories/replace-stories.use-case';
import { StoriesRepository } from '@/src/infrastructure/repositories/stories.repository';
import { MockStoriesRepository } from '@/src/infrastructure/repositories/stories.repository.mock';
import { getStoriesController } from '@/src/interface-adapters/controllers/stories/get-stories.controller';
import { replaceStoriesController } from '@/src/interface-adapters/controllers/stories/replace-stories.controller';

export function createStoriesModule() {
  const storiesModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    storiesModule.bind(DI_SYMBOLS.IStoriesRepository).toClass(MockStoriesRepository);
  } else {
    storiesModule
      .bind(DI_SYMBOLS.IStoriesRepository)
      .toClass(StoriesRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  storiesModule
    .bind(DI_SYMBOLS.IReplaceStoriesUseCase)
    .toHigherOrderFunction(replaceStoriesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IStoriesRepository]);
  storiesModule
    .bind(DI_SYMBOLS.IGetStoriesUseCase)
    .toHigherOrderFunction(getStoriesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IStoriesRepository]);

  storiesModule
    .bind(DI_SYMBOLS.IReplaceStoriesController)
    .toHigherOrderFunction(replaceStoriesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IReplaceStoriesUseCase,
    ]);
  storiesModule
    .bind(DI_SYMBOLS.IGetStoriesController)
    .toHigherOrderFunction(getStoriesController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IGetStoriesUseCase]);

  return storiesModule;
}
