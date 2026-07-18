import type { Run, RunInsert } from '@/src/entities/models/run';

export interface IRunsRepository {
  /** Records a pipeline-start outcome, overwriting any prior record for the broadcast. */
  saveRun(run: RunInsert): Promise<Run>;
  getRun(broadcastId: string): Promise<Run | undefined>;
}
