import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetRunUseCase } from '@/src/application/use-cases/runs/get-run.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Run } from '@/src/entities/models/run';

function presenter(run: Run, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getRun Presenter', op: 'serialize' }, () => ({
    id: run.id,
    broadcastId: run.broadcastId,
    runId: run.runId,
    startedAt: run.startedAt.toISOString(),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  }));
}

const inputSchema = z.string().min(1);

export type IGetRunController = ReturnType<typeof getRunController>;

export const getRunController =
  (instrumentationService: IInstrumentationService, getRunUseCase: IGetRunUseCase) =>
  (broadcastId: unknown): Promise<ReturnType<typeof presenter> | null> => {
    return instrumentationService.startSpan({ name: 'getRun Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const run = await getRunUseCase(data);
      return run ? presenter(run, instrumentationService) : null;
    });
  };
