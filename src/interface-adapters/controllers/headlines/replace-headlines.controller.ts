import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IReplaceHeadlinesUseCase } from '@/src/application/use-cases/headlines/replace-headlines.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { insertHeadlineSchema, type Headline } from '@/src/entities/models/headline';

function presenter(headlines: Headline[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'replaceHeadlines Presenter', op: 'serialize' }, () =>
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

const inputSchema = z.object({
  broadcastId: z.string().min(1),
  items: z.array(insertHeadlineSchema),
});

export type IReplaceHeadlinesController = ReturnType<typeof replaceHeadlinesController>;

export const replaceHeadlinesController =
  (instrumentationService: IInstrumentationService, replaceHeadlinesUseCase: IReplaceHeadlinesUseCase) =>
  (input: Partial<z.infer<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'replaceHeadlines Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid data', { cause: inputParseError });

      const headlines = await replaceHeadlinesUseCase(data.broadcastId, data.items);
      return presenter(headlines, instrumentationService);
    });
  };
