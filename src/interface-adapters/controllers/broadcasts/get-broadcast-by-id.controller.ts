import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBroadcastByIdUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-id.use-case';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { presentBroadcastRow } from './broadcast-presenters';

const inputSchema = z.string().min(1);

export type IGetBroadcastByIdController = ReturnType<typeof getBroadcastByIdController>;

export const getBroadcastByIdController =
  (instrumentationService: IInstrumentationService, getBroadcastByIdUseCase: IGetBroadcastByIdUseCase) =>
  (broadcastId: unknown): Promise<Awaited<ReturnType<typeof presentBroadcastRow>>> => {
    return instrumentationService.startSpan({ name: 'getBroadcastById Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(broadcastId);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const broadcast = await getBroadcastByIdUseCase(data);
      if (!broadcast) throw new NotFoundError('Broadcast not found');
      return presentBroadcastRow(broadcast, instrumentationService);
    });
  };
