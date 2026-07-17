import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { getFramesUseCase } from '@/src/application/use-cases/frames/get-frames.use-case';
import { replaceFramesUseCase } from '@/src/application/use-cases/frames/replace-frames.use-case';
import { FramesRepository } from '@/src/infrastructure/repositories/frames.repository';
import { MockFramesRepository } from '@/src/infrastructure/repositories/frames.repository.mock';
import { getFramesController } from '@/src/interface-adapters/controllers/frames/get-frames.controller';
import { replaceFramesController } from '@/src/interface-adapters/controllers/frames/replace-frames.controller';

export function createFramesModule() {
  const framesModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    framesModule.bind(DI_SYMBOLS.IFramesRepository).toClass(MockFramesRepository);
  } else {
    framesModule
      .bind(DI_SYMBOLS.IFramesRepository)
      .toClass(FramesRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  framesModule
    .bind(DI_SYMBOLS.IReplaceFramesUseCase)
    .toHigherOrderFunction(replaceFramesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IFramesRepository]);
  framesModule
    .bind(DI_SYMBOLS.IGetFramesUseCase)
    .toHigherOrderFunction(getFramesUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IFramesRepository]);

  framesModule
    .bind(DI_SYMBOLS.IReplaceFramesController)
    .toHigherOrderFunction(replaceFramesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IReplaceFramesUseCase,
    ]);
  framesModule
    .bind(DI_SYMBOLS.IGetFramesController)
    .toHigherOrderFunction(getFramesController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IGetFramesUseCase]);

  return framesModule;
}
