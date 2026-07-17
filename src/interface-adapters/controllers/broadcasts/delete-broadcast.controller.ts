import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDeleteBroadcastUseCase } from '@/src/application/use-cases/broadcasts/delete-broadcast.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.string().min(1);

export type IDeleteBroadcastController = ReturnType<typeof deleteBroadcastController>;

export const deleteBroadcastController =
  (instrumentationService: IInstrumentationService, deleteBroadcastUseCase: IDeleteBroadcastUseCase) =>
  (id: unknown): Promise<void> => {
    return instrumentationService.startSpan({ name: 'deleteBroadcast Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(id);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      await deleteBroadcastUseCase(data);
    });
  };
