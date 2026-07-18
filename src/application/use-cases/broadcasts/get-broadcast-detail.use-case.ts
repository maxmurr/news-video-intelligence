import { isPipelineComplete, type BroadcastRunStatus, type BroadcastStages } from '@/lib/broadcast-types';
import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IRunsRepository } from '@/src/application/repositories/runs.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRunStatusService } from '@/src/application/services/run-status.service.interface';
import type { Run } from '@/src/entities/models/run';
import { loadBroadcastAnalysis, type BroadcastAnalysis } from './broadcast-analysis';

export interface ResolvedRun {
  status: BroadcastRunStatus;
  startedAt: Date | null;
}

export interface BroadcastDetailResult extends BroadcastAnalysis {
  run: ResolvedRun;
}

/**
 * Health of the run behind an incomplete pipeline. A complete pipeline never
 * queries the engine — the stored stages are the proof. A missing run row
 * predates run tracking, and an engine query failure must not break the read
 * side, so both degrade to `unknown` rather than throwing.
 */
async function resolveRun(
  runStatusService: IRunStatusService,
  stages: BroadcastStages,
  run: Run | undefined,
): Promise<ResolvedRun> {
  if (isPipelineComplete(stages)) return { status: 'completed', startedAt: null };

  if (!run) return { status: 'unknown', startedAt: null };
  if (run.runId === null) return { status: 'not-started', startedAt: run.startedAt };

  try {
    return { status: await runStatusService.runStatus(run.runId), startedAt: run.startedAt };
  } catch {
    return { status: 'unknown', startedAt: run.startedAt };
  }
}

export type IGetBroadcastDetailUseCase = ReturnType<typeof getBroadcastDetailUseCase>;

/** Full analysis state for one broadcast, or null when it doesn't exist. */
export const getBroadcastDetailUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    runsRepository: IRunsRepository,
    transcriptsRepository: ITranscriptsRepository,
    storiesRepository: IStoriesRepository,
    headlinesRepository: IHeadlinesRepository,
    framesRepository: IFramesRepository,
    runStatusService: IRunStatusService,
  ) =>
  (filename: string): Promise<BroadcastDetailResult | null> => {
    return instrumentationService.startSpan({ name: 'getBroadcastDetail Use Case', op: 'function' }, async () => {
      const broadcast = await broadcastsRepository.getBroadcastByFilename(filename);
      if (!broadcast) return null;

      const [analysis, run] = await Promise.all([
        loadBroadcastAnalysis(
          { transcriptsRepository, storiesRepository, headlinesRepository, framesRepository },
          broadcast,
        ),
        runsRepository.getRun(broadcast.id),
      ]);

      return { ...analysis, run: await resolveRun(runStatusService, analysis.stages, run) };
    });
  };
