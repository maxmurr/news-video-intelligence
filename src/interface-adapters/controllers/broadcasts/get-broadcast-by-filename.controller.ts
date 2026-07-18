import { z } from 'zod';

import { uploads } from '@/lib/files';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBroadcastByFilenameUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-filename.use-case';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { Broadcast } from '@/src/entities/models/broadcast';

function presenter(broadcast: Broadcast, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getBroadcastByFilename Presenter', op: 'serialize' }, async () => ({
    id: broadcast.id,
    filename: broadcast.filename,
    url: await uploads.url(broadcast.url),
    size: broadcast.size,
    uploadedAt: broadcast.uploadedAt.toISOString(),
    createdAt: broadcast.createdAt.toISOString(),
    updatedAt: broadcast.updatedAt.toISOString(),
  }));
}

const inputSchema = z.string().min(1);

export type IGetBroadcastByFilenameController = ReturnType<typeof getBroadcastByFilenameController>;

export const getBroadcastByFilenameController =
  (instrumentationService: IInstrumentationService, getBroadcastByFilenameUseCase: IGetBroadcastByFilenameUseCase) =>
  (filename: unknown): Promise<Awaited<ReturnType<typeof presenter>>> => {
    return instrumentationService.startSpan({ name: 'getBroadcastByFilename Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(filename);
      if (inputParseError) throw new InputParseError('Invalid filename', { cause: inputParseError });

      const broadcast = await getBroadcastByFilenameUseCase(data);
      if (!broadcast) throw new NotFoundError('Broadcast not found');
      return presenter(broadcast, instrumentationService);
    });
  };
