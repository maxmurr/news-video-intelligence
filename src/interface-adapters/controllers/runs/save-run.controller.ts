import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISaveRunUseCase } from '@/src/application/use-cases/runs/save-run.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Run } from '@/src/entities/models/run';

function presenter(run: Run, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'saveRun Presenter', op: 'serialize' }, () => ({
    id: run.id,
    broadcastId: run.broadcastId,
    runId: run.runId,
    startedAt: run.startedAt.toISOString(),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  }));
}

const inputSchema = z.object({ broadcastId: z.string().min(1), runId: z.string().nullable() });

export type ISaveRunController = ReturnType<typeof saveRunController>;

export const saveRunController =
  (instrumentationService: IInstrumentationService, saveRunUseCase: ISaveRunUseCase) =>
  (input: Partial<z.infer<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'saveRun Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid data', { cause: inputParseError });

      const run = await saveRunUseCase(data);
      return presenter(run, instrumentationService);
    });
  };
