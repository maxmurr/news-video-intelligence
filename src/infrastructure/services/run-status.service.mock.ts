import type { IRunStatusService, WorkflowRunStatus } from '@/src/application/services/run-status.service.interface';

export class MockRunStatusService implements IRunStatusService {
  async runStatus(): Promise<WorkflowRunStatus> {
    return 'running';
  }
}
