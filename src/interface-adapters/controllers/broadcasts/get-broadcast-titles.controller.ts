import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBroadcastTitlesUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-titles.use-case';
import { InputParseError } from '@/src/entities/errors/common';

function presenter(titles: Map<string, string>, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getBroadcastTitles Presenter', op: 'serialize' }, () =>
    [...titles].map(([broadcastId, title]) => ({ broadcastId, title })),
  );
}

const inputSchema = z.object({ broadcastIds: z.array(z.string()) });

export type IGetBroadcastTitlesController = ReturnType<typeof getBroadcastTitlesController>;

export const getBroadcastTitlesController =
  (instrumentationService: IInstrumentationService, getBroadcastTitlesUseCase: IGetBroadcastTitlesUseCase) =>
  (input: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'getBroadcastTitles Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid broadcast ids', { cause: inputParseError });

      return presenter(await getBroadcastTitlesUseCase(data.broadcastIds), instrumentationService);
    });
  };
