import { z } from 'zod';

import { transcriptWireFields, type BroadcastDetail } from '@/lib/broadcast-types';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type {
  BroadcastDetailResult,
  IGetBroadcastDetailUseCase,
} from '@/src/application/use-cases/broadcasts/get-broadcast-detail.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { mergeStoryCards, presentSummary } from './broadcast-presenters';

function presenter(
  detail: BroadcastDetailResult,
  instrumentationService: IInstrumentationService,
): Promise<BroadcastDetail> {
  return instrumentationService.startSpan({ name: 'getBroadcastDetail Presenter', op: 'serialize' }, async () => ({
    ...(await presentSummary(detail)),
    stories: await mergeStoryCards(detail),
    ...transcriptWireFields(detail.transcript),
    run: {
      status: detail.run.status,
      startedAt: detail.run.startedAt?.toISOString() ?? null,
    },
  }));
}

const inputSchema = z.string().min(1);

export type IGetBroadcastDetailController = ReturnType<typeof getBroadcastDetailController>;

export const getBroadcastDetailController =
  (instrumentationService: IInstrumentationService, getBroadcastDetailUseCase: IGetBroadcastDetailUseCase) =>
  (broadcastId: unknown): Promise<BroadcastDetail | null> => {
    return instrumentationService.startSpan({ name: 'getBroadcastDetail Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const detail = await getBroadcastDetailUseCase(data);
      return detail === null ? null : presenter(detail, instrumentationService);
    });
  };
