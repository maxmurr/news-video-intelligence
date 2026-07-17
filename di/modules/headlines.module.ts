import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { getHeadlinesUseCase } from '@/src/application/use-cases/headlines/get-headlines.use-case';
import { replaceHeadlinesUseCase } from '@/src/application/use-cases/headlines/replace-headlines.use-case';
import { HeadlinesRepository } from '@/src/infrastructure/repositories/headlines.repository';
import { MockHeadlinesRepository } from '@/src/infrastructure/repositories/headlines.repository.mock';
import { getHeadlinesController } from '@/src/interface-adapters/controllers/headlines/get-headlines.controller';
import { replaceHeadlinesController } from '@/src/interface-adapters/controllers/headlines/replace-headlines.controller';

export function createHeadlinesModule() {
  const headlinesModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    headlinesModule.bind(DI_SYMBOLS.IHeadlinesRepository).toClass(MockHeadlinesRepository);
  } else {
    headlinesModule
      .bind(DI_SYMBOLS.IHeadlinesRepository)
      .toClass(HeadlinesRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  headlinesModule
    .bind(DI_SYMBOLS.IReplaceHeadlinesUseCase)
    .toHigherOrderFunction(replaceHeadlinesUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IHeadlinesRepository,
    ]);
  headlinesModule
    .bind(DI_SYMBOLS.IGetHeadlinesUseCase)
    .toHigherOrderFunction(getHeadlinesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IHeadlinesRepository]);

  headlinesModule
    .bind(DI_SYMBOLS.IReplaceHeadlinesController)
    .toHigherOrderFunction(replaceHeadlinesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IReplaceHeadlinesUseCase,
    ]);
  headlinesModule
    .bind(DI_SYMBOLS.IGetHeadlinesController)
    .toHigherOrderFunction(getHeadlinesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetHeadlinesUseCase,
    ]);

  return headlinesModule;
}
