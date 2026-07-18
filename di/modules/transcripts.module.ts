import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { TranscriptsRepository } from '@/src/infrastructure/repositories/transcripts.repository';
import { MockTranscriptsRepository } from '@/src/infrastructure/repositories/transcripts.repository.mock';

export function createTranscriptsModule() {
  const transcriptsModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    transcriptsModule.bind(DI_SYMBOLS.ITranscriptsRepository).toClass(MockTranscriptsRepository);
  } else {
    transcriptsModule
      .bind(DI_SYMBOLS.ITranscriptsRepository)
      .toClass(TranscriptsRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  return transcriptsModule;
}
