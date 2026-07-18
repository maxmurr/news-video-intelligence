import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { HeadlinesRepository } from '@/src/infrastructure/repositories/headlines.repository';
import { MockHeadlinesRepository } from '@/src/infrastructure/repositories/headlines.repository.mock';

export function createHeadlinesModule() {
  const headlinesModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    headlinesModule.bind(DI_SYMBOLS.IHeadlinesRepository).toClass(MockHeadlinesRepository);
  } else {
    headlinesModule
      .bind(DI_SYMBOLS.IHeadlinesRepository)
      .toClass(HeadlinesRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  return headlinesModule;
}
