import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { loadBroadcastAnalysis, type BroadcastAnalysis } from './broadcast-analysis';

export type IGetBroadcastSummariesUseCase = ReturnType<typeof getBroadcastSummariesUseCase>;

/** Analysis state for every broadcast, newest upload first. */
export const getBroadcastSummariesUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    transcriptsRepository: ITranscriptsRepository,
    storiesRepository: IStoriesRepository,
    headlinesRepository: IHeadlinesRepository,
    framesRepository: IFramesRepository,
  ) =>
  (): Promise<BroadcastAnalysis[]> => {
    return instrumentationService.startSpan({ name: 'getBroadcastSummaries Use Case', op: 'function' }, async () => {
      const broadcasts = await broadcastsRepository.getBroadcasts();
      const repositories = { transcriptsRepository, storiesRepository, headlinesRepository, framesRepository };
      return Promise.all(broadcasts.map(broadcast => loadBroadcastAnalysis(repositories, broadcast)));
    });
  };
