import type { Run, RunInsert } from '@/src/entities/models/run';
import type { ITransaction } from '@/src/entities/models/transaction.interface';

export interface IRunsRepository {
  /** Records a pipeline-start outcome, overwriting any prior record for the broadcast. */
  saveRun(run: RunInsert, tx?: ITransaction): Promise<Run>;
  getRun(broadcastId: string): Promise<Run | undefined>;
  deleteRun(broadcastId: string, tx?: ITransaction): Promise<void>;
}
