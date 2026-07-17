import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetHeadlinesUseCase } from '@/src/application/use-cases/headlines/get-headlines.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Headline } from '@/src/entities/models/headline';

function presenter(headlines: Headline[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getHeadlines Presenter', op: 'serialize' }, () =>
    headlines.map(headline => ({
      id: headline.id,
      broadcastId: headline.broadcastId,
      idx: headline.idx,
      startTime: headline.startTime,
      endTime: headline.endTime,
      headline: headline.headline,
      summary: headline.summary,
      createdAt: headline.createdAt.toISOString(),
    })),
  );
}

const inputSchema = z.string().min(1);

export type IGetHeadlinesController = ReturnType<typeof getHeadlinesController>;

export const getHeadlinesController =
  (instrumentationService: IInstrumentationService, getHeadlinesUseCase: IGetHeadlinesUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'getHeadlines Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const headlines = await getHeadlinesUseCase(data);
      return presenter(headlines, instrumentationService);
    });
  };
