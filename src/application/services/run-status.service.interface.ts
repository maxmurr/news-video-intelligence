export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Queries the workflow engine for the live status of a pipeline run. */
export interface IRunStatusService {
  runStatus(runId: string): Promise<WorkflowRunStatus>;
}
