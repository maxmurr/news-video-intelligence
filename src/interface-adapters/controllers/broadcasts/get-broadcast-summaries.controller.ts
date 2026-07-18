import type { BroadcastSummary } from '@/lib/broadcast-types';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BroadcastAnalysis } from '@/src/application/use-cases/broadcasts/broadcast-analysis';
import type { IGetBroadcastSummariesUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-summaries.use-case';
import { presentSummary } from './broadcast-presenters';

function presenter(analyses: BroadcastAnalysis[], instrumentationService: IInstrumentationService): BroadcastSummary[] {
  return instrumentationService.startSpan({ name: 'getBroadcastSummaries Presenter', op: 'serialize' }, () =>
    analyses.map(presentSummary),
  );
}

export type IGetBroadcastSummariesController = ReturnType<typeof getBroadcastSummariesController>;

export const getBroadcastSummariesController =
  (instrumentationService: IInstrumentationService, getBroadcastSummariesUseCase: IGetBroadcastSummariesUseCase) =>
  (): Promise<BroadcastSummary[]> => {
    return instrumentationService.startSpan({ name: 'getBroadcastSummaries Controller' }, async () => {
      return presenter(await getBroadcastSummariesUseCase(), instrumentationService);
    });
  };
