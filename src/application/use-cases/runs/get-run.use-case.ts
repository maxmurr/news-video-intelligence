import type { IRunsRepository } from '@/src/application/repositories/runs.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Run } from '@/src/entities/models/run';

export type IGetRunUseCase = ReturnType<typeof getRunUseCase>;

/** Undefined when no start was ever attempted for the broadcast. */
export const getRunUseCase =
  (instrumentationService: IInstrumentationService, runsRepository: IRunsRepository) =>
  (broadcastId: string): Promise<Run | undefined> => {
    return instrumentationService.startSpan({ name: 'getRun Use Case', op: 'function' }, async () => {
      return runsRepository.getRun(broadcastId);
    });
  };
