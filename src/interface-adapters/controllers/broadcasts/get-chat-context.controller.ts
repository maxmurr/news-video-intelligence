import { z } from 'zod';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type {
  ChatContext,
  IGetChatContextUseCase,
} from '@/src/application/use-cases/broadcasts/get-chat-context.use-case';
import { InputParseError } from '@/src/entities/errors/common';

function presenter(context: ChatContext, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getChatContext Presenter', op: 'serialize' }, () => ({
    /** Null while the broadcast is still being transcribed. */
    transcript: context.transcript?.text ?? null,
    headlines: context.headlines.map(item => ({
      startTime: item.startTime,
      endTime: item.endTime,
      headline: item.headline,
      summary: item.summary,
    })),
  }));
}

const inputSchema = z.string().min(1);

export type IGetChatContextController = ReturnType<typeof getChatContextController>;

export const getChatContextController =
  (instrumentationService: IInstrumentationService, getChatContextUseCase: IGetChatContextUseCase) =>
  (filename: unknown): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'getChatContext Controller' }, async () => {
      const { data, error: inputParseError } = inputSchema.safeParse(filename);
      if (inputParseError) throw new InputParseError('Invalid filename', { cause: inputParseError });

      return presenter(await getChatContextUseCase(data), instrumentationService);
    });
  };
