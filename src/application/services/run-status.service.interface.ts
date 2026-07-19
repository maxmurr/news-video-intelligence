export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface IRunStatusService {
  runStatus(runId: string): Promise<WorkflowRunStatus>;
}
