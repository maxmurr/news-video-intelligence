import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBroadcastUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Broadcast } from '@/src/entities/models/broadcast';

function presenter(broadcast: Broadcast, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getBroadcast Presenter', op: 'serialize' }, () => ({
    id: broadcast.id,
    filename: broadcast.filename,
    url: broadcast.url,
    size: broadcast.size,
    uploadedAt: broadcast.uploadedAt.toISOString(),
    createdAt: broadcast.createdAt.toISOString(),
    updatedAt: broadcast.updatedAt.toISOString(),
  }));
}

const inputSchema = z.string().min(1);

export type IGetBroadcastController = ReturnType<typeof getBroadcastController>;

export const getBroadcastController =
  (instrumentationService: IInstrumentationService, getBroadcastUseCase: IGetBroadcastUseCase) =>
  (id: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'getBroadcast Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(id);
      if (inputParseError) throw new InputParseError('Invalid broadcast id', { cause: inputParseError });

      const broadcast = await getBroadcastUseCase(data);
      return presenter(broadcast, instrumentationService);
    });
  };
