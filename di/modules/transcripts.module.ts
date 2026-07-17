import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { getTranscriptUseCase } from '@/src/application/use-cases/transcripts/get-transcript.use-case';
import { saveTranscriptUseCase } from '@/src/application/use-cases/transcripts/save-transcript.use-case';
import { TranscriptsRepository } from '@/src/infrastructure/repositories/transcripts.repository';
import { MockTranscriptsRepository } from '@/src/infrastructure/repositories/transcripts.repository.mock';
import { getTranscriptController } from '@/src/interface-adapters/controllers/transcripts/get-transcript.controller';
import { saveTranscriptController } from '@/src/interface-adapters/controllers/transcripts/save-transcript.controller';

export function createTranscriptsModule() {
  const transcriptsModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    transcriptsModule.bind(DI_SYMBOLS.ITranscriptsRepository).toClass(MockTranscriptsRepository);
  } else {
    transcriptsModule
      .bind(DI_SYMBOLS.ITranscriptsRepository)
      .toClass(TranscriptsRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  transcriptsModule
    .bind(DI_SYMBOLS.ISaveTranscriptUseCase)
    .toHigherOrderFunction(saveTranscriptUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ITranscriptsRepository,
    ]);
  transcriptsModule
    .bind(DI_SYMBOLS.IGetTranscriptUseCase)
    .toHigherOrderFunction(getTranscriptUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ITranscriptsRepository,
    ]);

  transcriptsModule
    .bind(DI_SYMBOLS.ISaveTranscriptController)
    .toHigherOrderFunction(saveTranscriptController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ISaveTranscriptUseCase,
    ]);
  transcriptsModule
    .bind(DI_SYMBOLS.IGetTranscriptController)
    .toHigherOrderFunction(getTranscriptController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetTranscriptUseCase,
    ]);

  return transcriptsModule;
}
