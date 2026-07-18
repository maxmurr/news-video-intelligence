import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IGetBroadcastTitlesUseCase = ReturnType<typeof getBroadcastTitlesUseCase>;

/**
 * The top headline of each named broadcast, keyed by id — the desk assistant's
 * cheap title lookup for attributing library search hits, in place of loading
 * every broadcast's full summary. Broadcasts without a headline are absent from
 * the map; an empty id list yields an empty map without a query.
 */
export const getBroadcastTitlesUseCase =
  (instrumentationService: IInstrumentationService, headlinesRepository: IHeadlinesRepository) =>
  (broadcastIds: string[]): Promise<Map<string, string>> => {
    return instrumentationService.startSpan({ name: 'getBroadcastTitles Use Case', op: 'function' }, async () => {
      if (broadcastIds.length === 0) return new Map();
      const rows = await headlinesRepository.getTopHeadlines(broadcastIds);
      return new Map(rows.map(row => [row.broadcastId, row.headline]));
    });
  };
