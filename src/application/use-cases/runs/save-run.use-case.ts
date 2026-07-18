import type { IRunsRepository } from '@/src/application/repositories/runs.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Run, RunInsert } from '@/src/entities/models/run';

export type ISaveRunUseCase = ReturnType<typeof saveRunUseCase>;

export const saveRunUseCase =
  (instrumentationService: IInstrumentationService, runsRepository: IRunsRepository) =>
  (input: RunInsert): Promise<Run> => {
    return instrumentationService.startSpan({ name: 'saveRun Use Case', op: 'function' }, async () => {
      return runsRepository.saveRun(input);
    });
  };
