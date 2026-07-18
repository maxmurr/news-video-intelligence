import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGenerateHeadlinesUseCase } from '@/src/application/use-cases/pipeline/generate-headlines.use-case';
import type { StageResult } from '@/src/application/use-cases/pipeline/shared';
import { InputParseError } from '@/src/entities/errors/common';
import type { Headline } from '@/src/entities/models/headline';

function presenter(result: StageResult<Headline[]>, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'generateHeadlines Presenter', op: 'serialize' }, () => ({
    cached: result.cached,
    items: result.data.map(item => ({
      startTime: item.startTime,
      endTime: item.endTime,
      headline: item.headline,
      summary: item.summary,
    })),
  }));
}

const inputSchema = z.string().min(1);

export type IGenerateHeadlinesController = ReturnType<typeof generateHeadlinesController>;

export const generateHeadlinesController =
  (instrumentationService: IInstrumentationService, generateHeadlinesUseCase: IGenerateHeadlinesUseCase) =>
  (filename: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'generateHeadlines Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(filename);
      if (inputParseError) throw new InputParseError('Invalid filename', { cause: inputParseError });

      return presenter(await generateHeadlinesUseCase(data), instrumentationService);
    });
  };
