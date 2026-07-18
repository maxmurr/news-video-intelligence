import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { FramesRepository } from '@/src/infrastructure/repositories/frames.repository';
import { MockFramesRepository } from '@/src/infrastructure/repositories/frames.repository.mock';

export function createFramesModule() {
  const framesModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    framesModule.bind(DI_SYMBOLS.IFramesRepository).toClass(MockFramesRepository);
  } else {
    framesModule
      .bind(DI_SYMBOLS.IFramesRepository)
      .toClass(FramesRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  return framesModule;
}
