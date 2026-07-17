import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateBroadcastUseCase } from '@/src/application/use-cases/broadcasts/create-broadcast.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Broadcast } from '@/src/entities/models/broadcast';

function presenter(broadcast: Broadcast, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'createBroadcast Presenter', op: 'serialize' }, () => ({
    id: broadcast.id,
    filename: broadcast.filename,
    url: broadcast.url,
    size: broadcast.size,
    uploadedAt: broadcast.uploadedAt.toISOString(),
    createdAt: broadcast.createdAt.toISOString(),
    updatedAt: broadcast.updatedAt.toISOString(),
  }));
}

const inputSchema = z.object({
  filename: z.string().min(1),
  url: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export type ICreateBroadcastController = ReturnType<typeof createBroadcastController>;

export const createBroadcastController =
  (instrumentationService: IInstrumentationService, createBroadcastUseCase: ICreateBroadcastUseCase) =>
  (input: Partial<z.infer<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'createBroadcast Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(input);
      if (inputParseError) throw new InputParseError('Invalid data', { cause: inputParseError });

      const broadcast = await createBroadcastUseCase(data);
      return presenter(broadcast, instrumentationService);
    });
  };
