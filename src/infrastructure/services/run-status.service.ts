import { getRun } from 'workflow/api';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRunStatusService, WorkflowRunStatus } from '@/src/application/services/run-status.service.interface';

export class RunStatusService implements IRunStatusService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  async runStatus(runId: string): Promise<WorkflowRunStatus> {
    return this.instrumentationService.startSpan(
      { name: 'RunStatusService > runStatus', op: 'function' },
      () => getRun(runId).status,
    );
  }
}
