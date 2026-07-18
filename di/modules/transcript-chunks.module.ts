import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { TranscriptChunksRepository } from '@/src/infrastructure/repositories/transcript-chunks.repository';
import { MockTranscriptChunksRepository } from '@/src/infrastructure/repositories/transcript-chunks.repository.mock';

export function createTranscriptChunksModule() {
  const transcriptChunksModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    transcriptChunksModule.bind(DI_SYMBOLS.ITranscriptChunksRepository).toClass(MockTranscriptChunksRepository);
  } else {
    transcriptChunksModule
      .bind(DI_SYMBOLS.ITranscriptChunksRepository)
      .toClass(TranscriptChunksRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  return transcriptChunksModule;
}
