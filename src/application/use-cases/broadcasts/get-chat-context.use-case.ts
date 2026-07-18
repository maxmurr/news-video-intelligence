import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Headline } from '@/src/entities/models/headline';
import type { Transcript } from '@/src/entities/models/transcript';

export interface ChatContext {
  /** Null while the broadcast is still being transcribed. */
  transcript: Transcript | null;
  headlines: Headline[];
}

export type IGetChatContextUseCase = ReturnType<typeof getChatContextUseCase>;

/**
 * Everything the chat model grounds its answers in. A missing broadcast is an
 * error; a missing transcript is a normal in-progress state the caller turns
 * into a "try again shortly".
 */
export const getChatContextUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    transcriptsRepository: ITranscriptsRepository,
    headlinesRepository: IHeadlinesRepository,
  ) =>
  (broadcastId: string): Promise<ChatContext> => {
    return instrumentationService.startSpan({ name: 'getChatContext Use Case', op: 'function' }, async () => {
      const broadcast = await broadcastsRepository.getBroadcast(broadcastId);
      if (!broadcast) throw new NotFoundError(`No broadcast ${broadcastId}`);

      const [transcript, headlines] = await Promise.all([
        transcriptsRepository.getTranscript(broadcast.id),
        headlinesRepository.getHeadlines(broadcast.id),
      ]);

      return { transcript: transcript ?? null, headlines };
    });
  };
