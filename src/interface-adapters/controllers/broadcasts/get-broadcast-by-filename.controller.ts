import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBroadcastByFilenameUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-filename.use-case';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { presentBroadcastRow } from './broadcast-presenters';

const inputSchema = z.string().min(1);

export type IGetBroadcastByFilenameController = ReturnType<typeof getBroadcastByFilenameController>;

/** Filename is internal; this lookup serves the local-fixture eval harness. */
export const getBroadcastByFilenameController =
  (instrumentationService: IInstrumentationService, getBroadcastByFilenameUseCase: IGetBroadcastByFilenameUseCase) =>
  (filename: unknown): Promise<Awaited<ReturnType<typeof presentBroadcastRow>>> => {
    return instrumentationService.startSpan({ name: 'getBroadcastByFilename Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(filename);
      if (inputParseError) throw new InputParseError('Invalid filename', { cause: inputParseError });

      const broadcast = await getBroadcastByFilenameUseCase(data);
      if (!broadcast) throw new NotFoundError('Broadcast not found');
      return presentBroadcastRow(broadcast, instrumentationService);
    });
  };
