import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { saveRunUseCase } from '@/src/application/use-cases/runs/save-run.use-case';
import { RunsRepository } from '@/src/infrastructure/repositories/runs.repository';
import { MockRunsRepository } from '@/src/infrastructure/repositories/runs.repository.mock';
import { RunStatusService } from '@/src/infrastructure/services/run-status.service';
import { MockRunStatusService } from '@/src/infrastructure/services/run-status.service.mock';
import { saveRunController } from '@/src/interface-adapters/controllers/runs/save-run.controller';

export function createRunsModule() {
  const runsModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    runsModule.bind(DI_SYMBOLS.IRunsRepository).toClass(MockRunsRepository);
    runsModule.bind(DI_SYMBOLS.IRunStatusService).toClass(MockRunStatusService);
  } else {
    runsModule
      .bind(DI_SYMBOLS.IRunsRepository)
      .toClass(RunsRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
    runsModule.bind(DI_SYMBOLS.IRunStatusService).toClass(RunStatusService, [DI_SYMBOLS.IInstrumentationService]);
  }

  runsModule
    .bind(DI_SYMBOLS.ISaveRunUseCase)
    .toHigherOrderFunction(saveRunUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IRunsRepository]);

  runsModule
    .bind(DI_SYMBOLS.ISaveRunController)
    .toHigherOrderFunction(saveRunController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ISaveRunUseCase]);

  return runsModule;
}
