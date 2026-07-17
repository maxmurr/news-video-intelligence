import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { getRunUseCase } from '@/src/application/use-cases/runs/get-run.use-case';
import { saveRunUseCase } from '@/src/application/use-cases/runs/save-run.use-case';
import { RunsRepository } from '@/src/infrastructure/repositories/runs.repository';
import { MockRunsRepository } from '@/src/infrastructure/repositories/runs.repository.mock';
import { getRunController } from '@/src/interface-adapters/controllers/runs/get-run.controller';
import { saveRunController } from '@/src/interface-adapters/controllers/runs/save-run.controller';

export function createRunsModule() {
  const runsModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    runsModule.bind(DI_SYMBOLS.IRunsRepository).toClass(MockRunsRepository);
  } else {
    runsModule
      .bind(DI_SYMBOLS.IRunsRepository)
      .toClass(RunsRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  runsModule
    .bind(DI_SYMBOLS.ISaveRunUseCase)
    .toHigherOrderFunction(saveRunUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IRunsRepository]);
  runsModule
    .bind(DI_SYMBOLS.IGetRunUseCase)
    .toHigherOrderFunction(getRunUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IRunsRepository]);

  runsModule
    .bind(DI_SYMBOLS.ISaveRunController)
    .toHigherOrderFunction(saveRunController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ISaveRunUseCase]);
  runsModule
    .bind(DI_SYMBOLS.IGetRunController)
    .toHigherOrderFunction(getRunController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IGetRunUseCase]);

  return runsModule;
}
